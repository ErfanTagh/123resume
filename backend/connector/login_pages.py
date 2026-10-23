"""
Connector OAuth login: email/password and Google / LinkedIn / GitHub.

Social reuses Django /api/auth/social/... then returns to /connector/oauth/done
with a SimpleJWT access token (same pattern as the website OAuthCallback).
"""
from __future__ import annotations

import html
from typing import TYPE_CHECKING
from urllib.parse import quote

from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse, Response

if TYPE_CHECKING:
    from connector.oauth_provider import ResumeOAuthProvider

SITE_URL = None  # set from server via configure()
PUBLIC_URL = None
_oauth: ResumeOAuthProvider | None = None


def configure(*, public_url: str, site_url: str, oauth_provider: ResumeOAuthProvider) -> None:
    global PUBLIC_URL, SITE_URL, _oauth
    PUBLIC_URL = public_url.rstrip("/")
    SITE_URL = site_url.rstrip("/")
    _oauth = oauth_provider


def _provider() -> ResumeOAuthProvider:
    if _oauth is None:
        raise RuntimeError("login_pages not configured")
    return _oauth


def resolve_user_id(identifier: str, password: str) -> int | None:
    """Same rules as api.auth_views.login: username or email, verified active only."""
    identifier = (identifier or "").strip()
    if not identifier or not password:
        return None

    user_obj = None
    try:
        user_obj = User.objects.get(username=identifier)
    except User.DoesNotExist:
        try:
            user_obj = User.objects.get(email__iexact=identifier)
        except User.MultipleObjectsReturned:
            user_obj = User.objects.filter(email__iexact=identifier).first()
        except User.DoesNotExist:
            pass

    if user_obj is not None and not user_obj.is_active:
        return None

    auth_username = user_obj.username if user_obj is not None else identifier
    user = authenticate(username=auth_username, password=password)
    if user is None or not user.is_active:
        return None
    return int(user.id)


def user_id_from_jwt(access_token: str) -> int | None:
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError
    except ImportError:
        return None
    try:
        token = AccessToken(access_token)
        uid = token.get("user_id")
        return int(uid) if uid is not None else None
    except (TokenError, TypeError, ValueError):
        return None


def _login_html(state: str, error: str = "") -> str:
    err = f'<p class="err">{html.escape(error)}</p>' if error else ""
    st = html.escape(state)
    site = html.escape(SITE_URL or PUBLIC_URL or "")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Connect 123Resume</title>
  <style>
    :root {{ --ink:#1a1a1a; --muted:#5c5c5c; --line:#e5e5e5; --accent:#2563eb; --bg:#f7f7f5; }}
    * {{ box-sizing: border-box; }}
    body {{ margin:0; min-height:100vh; font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(160deg, #f7f7f5 0%, #e8eef8 100%); color:var(--ink);
      display:flex; align-items:center; justify-content:center; padding:24px; }}
    main {{ width:100%; max-width:400px; background:#fff; border:1px solid var(--line);
      border-radius:12px; padding:28px 24px 24px; box-shadow:0 8px 30px rgba(0,0,0,.06); }}
    h1 {{ font-size:1.25rem; margin:0 0 4px; font-weight:650; }}
    .sub {{ color:var(--muted); font-size:.9rem; margin:0 0 20px; }}
    label {{ display:block; font-size:.8rem; font-weight:600; margin-bottom:6px; }}
    input {{ width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px;
      font-size:1rem; margin-bottom:14px; }}
    button.primary {{ width:100%; padding:11px 14px; border:0; border-radius:8px;
      background:var(--accent); color:#fff; font-weight:600; font-size:1rem; cursor:pointer; }}
    button.primary:hover {{ filter:brightness(.95); }}
    .err {{ color:#b91c1c; font-size:.9rem; margin:0 0 12px; }}
    .or {{ display:flex; align-items:center; gap:10px; color:var(--muted); font-size:.8rem; margin:18px 0; }}
    .or::before, .or::after {{ content:""; flex:1; height:1px; background:var(--line); }}
    .social {{ display:flex; flex-direction:column; gap:8px; }}
    .social a {{ display:block; text-align:center; padding:10px 12px; border:1px solid var(--line);
      border-radius:8px; text-decoration:none; color:var(--ink); font-weight:550; font-size:.95rem; }}
    .social a:hover {{ background:var(--bg); }}
    .foot {{ margin-top:18px; font-size:.75rem; color:var(--muted); text-align:center; }}
    .foot a {{ color:var(--accent); }}
  </style>
</head>
<body>
  <main>
    <h1>Connect 123Resume</h1>
    <p class="sub">Sign in so Claude can read and edit your resumes.</p>
    {err}
    <form method="post" action="/connector/login/callback">
      <input type="hidden" name="state" value="{st}"/>
      <label for="username">Email or username</label>
      <input id="username" name="username" type="text" autocomplete="username" required/>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required/>
      <button class="primary" type="submit">Sign in</button>
    </form>
    <div class="or">or</div>
    <div class="social">
      <a href="/connector/login/social/google?state={st}">Continue with Google</a>
      <a href="/connector/login/social/linkedin?state={st}">Continue with LinkedIn</a>
      <a href="/connector/login/social/github?state={st}">Continue with GitHub</a>
    </div>
    <p class="foot">Need an account? <a href="{site}/signup" target="_blank" rel="noopener">Sign up on 123Resume</a></p>
  </main>
</body>
</html>"""


async def login_page(request: Request) -> Response:
    state = request.query_params.get("state") or ""
    if not state:
        return HTMLResponse("<p>Missing state. Start again from Claude.</p>", status_code=400)
    error = request.query_params.get("error") or ""
    return HTMLResponse(_login_html(state, error))


async def login_callback(request: Request) -> Response:
    form = await request.form()
    state = form.get("state")
    username = form.get("username")
    password = form.get("password")
    if not isinstance(state, str) or not state:
        return HTMLResponse("<p>Missing state.</p>", status_code=400)
    if not isinstance(username, str) or not isinstance(password, str):
        return HTMLResponse(_login_html(state, "Invalid form."), status_code=400)

    import anyio

    user_id = await anyio.to_thread.run_sync(resolve_user_id, username, password)
    if user_id is None:
        return HTMLResponse(_login_html(state, "Invalid credentials or unverified email."), status_code=401)

    try:
        redirect_url = await _provider().complete_login(state, user_id)
    except ValueError:
        return HTMLResponse(_login_html(state, "Login expired. Try connecting again from Claude."), status_code=400)
    return RedirectResponse(url=redirect_url, status_code=302)


async def login_social_start(request: Request) -> Response:
    """Set a short-lived cookie, then send the browser into Django social OAuth."""
    provider = (request.path_params.get("provider") or "").lower()
    if provider not in ("google", "linkedin", "github"):
        return HTMLResponse("<p>Unsupported provider.</p>", status_code=400)
    state = request.query_params.get("state") or ""
    if not state:
        return HTMLResponse("<p>Missing state.</p>", status_code=400)

    done = f"{PUBLIC_URL}/connector/oauth/done"
    api = f"{SITE_URL}/api/auth/social/{provider}/url/?redirect_uri={quote(done, safe='')}"

    # Intermediate page: fetch auth URL (sets Django session cookie) then redirect.
    # mcp_state is kept in a SameSite cookie so Django's ?token redirect stays clean.
    page = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Redirecting…</title></head>
<body>
<p>Redirecting to {html.escape(provider)}…</p>
<script>
document.cookie = "mcp_oauth_state={html.escape(state)}; Path=/; Max-Age=600; SameSite=Lax";
fetch({api!r}, {{ credentials: "include" }})
  .then(r => r.json())
  .then(d => {{
    if (d.auth_url) location.href = d.auth_url;
    else location.href = "/connector/login?state={html.escape(state)}&error=" + encodeURIComponent(d.error || "Social login unavailable");
  }})
  .catch(() => {{ location.href = "/connector/login?state={html.escape(state)}&error=Social%20login%20failed"; }});
</script>
</body></html>"""
    return HTMLResponse(page)


async def oauth_done(request: Request) -> Response:
    """Land here after Django social callback with access_token in the query string."""
    access = request.query_params.get("access_token") or ""
    state = request.cookies.get("mcp_oauth_state") or ""
    if not access or not state:
        return HTMLResponse(
            "<p>Missing token or login state. Try connecting again from Claude.</p>",
            status_code=400,
        )

    import anyio

    user_id = await anyio.to_thread.run_sync(user_id_from_jwt, access)
    if user_id is None:
        return HTMLResponse("<p>Invalid session token.</p>", status_code=401)

    try:
        redirect_url = await _provider().complete_login(state, user_id)
    except ValueError:
        return HTMLResponse("<p>Login expired. Try connecting again from Claude.</p>", status_code=400)

    resp = RedirectResponse(url=redirect_url, status_code=302)
    resp.delete_cookie("mcp_oauth_state", path="/")
    return resp
