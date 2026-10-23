"""
Connector OAuth login: email/password and Google / LinkedIn / GitHub.

Social reuses Django /api/auth/social/... then returns to /connector/oauth/done
with a SimpleJWT access token (same pattern as the website OAuthCallback).
UI mirrors frontend Login.tsx (colors, card, social row).
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
    from connector.login_html import render_login_page

    return render_login_page(
        state=state,
        error=error,
        site_url=SITE_URL or PUBLIC_URL or "https://123resume.de",
    )


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
    site = html.escape(SITE_URL or PUBLIC_URL or "")
    prov = html.escape(provider)
    st = html.escape(state)

    page = f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Connecting… — 123Resume</title>
<style>
  body{{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
    background:linear-gradient(to bottom right,#faf8f6,#f5f2f0,#faf8f6);color:#1c1917}}
  .box{{text-align:center;padding:2rem}}
  img{{height:40px;width:auto;margin-bottom:1rem}}
  .spin{{width:1.25rem;height:1.25rem;margin:0 auto .75rem;border:2px solid #ec3d6e;
    border-top-color:transparent;border-radius:9999px;animation:s .7s linear infinite}}
  @keyframes s{{to{{transform:rotate(360deg)}}}}
  p{{color:#656d7c;font-size:.9rem;margin:0}}
</style></head>
<body>
<div class="box">
  <img src="{site}/logoo.png" alt="123Resume" width="120" height="40"
       onerror="this.style.display='none'"/>
  <div class="spin" aria-hidden="true"></div>
  <p>Continuing with {prov}…</p>
</div>
<script>
document.cookie = "mcp_oauth_state={st}; Path=/; Max-Age=600; SameSite=Lax; Secure";
fetch({api!r}, {{ credentials: "include" }})
  .then(r => r.json())
  .then(d => {{
    if (d.auth_url) location.href = d.auth_url;
    else location.href = "/connector/login?state={st}&error=" + encodeURIComponent(d.error || "Social login unavailable");
  }})
  .catch(() => {{ location.href = "/connector/login?state={st}&error=Social%20login%20failed"; }});
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
