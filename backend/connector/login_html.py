"""HTML for connector OAuth login — styled to match frontend Login.tsx."""
from __future__ import annotations

import html


def render_login_page(*, state: str, error: str, site_url: str) -> str:
    st = html.escape(state)
    site = html.escape(site_url.rstrip("/"))
    err_block = ""
    if error:
        err_block = f"""
        <div class="alert" role="alert">
          <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{html.escape(error)}</p>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Login — 123Resume</title>
  <link rel="icon" href="{site}/logoo.png"/>
  <style>
    :root {{
      --background: hsl(28 33% 98%);
      --foreground: hsl(222 22% 12%);
      --card: #ffffff;
      --muted: hsl(24 24% 95%);
      --muted-foreground: hsl(222 12% 45%);
      --primary: hsl(344 84% 55%);
      --primary-foreground: #ffffff;
      --border: hsl(24 18% 88%);
      --destructive: hsl(0 72% 51%);
      --destructive-fg: hsl(0 72% 40%);
      --destructive-bg: hsl(0 86% 97%);
      --radius: 0.75rem;
      --shadow: 0 8px 24px -4px hsl(338 50% 30% / 0.14);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: var(--foreground);
      background: linear-gradient(to bottom right, var(--background), var(--muted), var(--background));
      display: flex; align-items: center; justify-content: center;
      padding: 3rem 1rem;
    }}
    .card {{
      width: 100%; max-width: 28rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 2rem;
      box-shadow: var(--shadow);
    }}
    .brand {{
      display: flex; justify-content: center; margin-bottom: 1.25rem;
    }}
    .brand img {{ height: 2.25rem; width: auto; }}
    .hero-icon {{
      display: inline-flex; align-items: center; justify-content: center;
      width: 4rem; height: 4rem; border-radius: 9999px;
      background: hsl(344 84% 55% / 0.1); margin-bottom: 1rem;
    }}
    .hero-icon svg {{ width: 2rem; height: 2rem; color: var(--primary); }}
    .head {{ text-align: center; margin-bottom: 2rem; }}
    .head h1 {{
      margin: 0 0 0.5rem; font-size: 1.875rem; line-height: 2.25rem;
      font-weight: 700; letter-spacing: -0.02em;
    }}
    .head p {{ margin: 0; color: var(--muted-foreground); font-size: 0.95rem; }}
    .alert {{
      display: flex; gap: 0.5rem; align-items: flex-start;
      margin-bottom: 1.5rem; padding: 0.75rem 1rem;
      border-radius: calc(var(--radius) - 2px);
      background: var(--destructive-bg); color: var(--destructive-fg);
      border: 1px solid hsl(0 72% 51% / 0.25); font-size: 0.875rem;
    }}
    .alert p {{ margin: 0; }}
    .alert-icon {{ width: 1rem; height: 1rem; flex-shrink: 0; margin-top: 0.1rem; }}
    label {{ display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }}
    .field {{ margin-bottom: 1.5rem; }}
    .label-row {{
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.5rem;
    }}
    .label-row label {{ margin: 0; }}
    .label-row a {{
      font-size: 0.75rem; color: var(--primary); text-decoration: none;
    }}
    .label-row a:hover {{ text-decoration: underline; }}
    input[type="text"], input[type="password"] {{
      width: 100%; height: 2.5rem; padding: 0 0.75rem;
      border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px);
      background: #fff; font-size: 0.95rem; color: var(--foreground);
      outline: none; transition: border-color .15s, box-shadow .15s;
    }}
    input:focus {{
      border-color: var(--primary);
      box-shadow: 0 0 0 3px hsl(344 84% 55% / 0.18);
    }}
    .btn-primary {{
      width: 100%; height: 2.5rem; border: 0; border-radius: calc(var(--radius) - 2px);
      background: var(--primary); color: var(--primary-foreground);
      font-size: 0.95rem; font-weight: 600; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
    }}
    .btn-primary:hover {{ filter: brightness(0.96); }}
    .btn-primary svg {{ width: 1rem; height: 1rem; }}
    .divider {{
      position: relative; margin: 1.5rem 0; text-align: center;
    }}
    .divider::before {{
      content: ""; position: absolute; left: 0; right: 0; top: 50%;
      border-top: 1px solid var(--border);
    }}
    .divider span {{
      position: relative; background: var(--card); padding: 0 0.5rem;
      font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--muted-foreground);
    }}
    .social {{
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;
    }}
    .social a {{
      height: 2.5rem; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border); border-radius: calc(var(--radius) - 2px);
      text-decoration: none; color: var(--foreground); background: #fff;
      transition: background .15s, border-color .15s, filter .15s;
    }}
    .social a:hover {{ background: var(--muted); }}
    .social a svg {{ width: 1rem; height: 1rem; }}
    .social a.li {{
      background: #0A66C2; border-color: #0A66C2; color: #fff;
    }}
    .social a.li:hover {{ background: #0d7bd4; border-color: #0d7bd4; }}
    .social a.gh {{
      background: #24292e; border-color: #24292e; color: #fff;
    }}
    .social a.gh:hover {{ background: #2d3339; border-color: #2d3339; }}
    .foot {{
      margin-top: 1.5rem; text-align: center; font-size: 0.875rem;
      color: var(--muted-foreground);
    }}
    .foot a {{ color: var(--primary); font-weight: 500; text-decoration: none; }}
    .foot a:hover {{ text-decoration: underline; }}
    .note {{
      margin-top: 1rem; text-align: center; font-size: 0.75rem;
      color: var(--muted-foreground);
    }}
  </style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <a href="{site}/" target="_blank" rel="noopener">
        <img src="{site}/logoo.png" alt="123Resume" width="140" height="36"
             onerror="this.parentElement.style.display='none'"/>
      </a>
    </div>
    <div class="head">
      <div class="hero-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
      </div>
      <h1>Welcome Back</h1>
      <p>Sign in to connect Claude to your 123Resume account</p>
    </div>
    {err_block}
    <form method="post" action="/connector/login/callback" autocomplete="on">
      <input type="hidden" name="state" value="{st}"/>
      <div class="field">
        <label for="username">Username or email</label>
        <input id="username" name="username" type="text" autocomplete="username"
               placeholder="Your username or account email" required/>
      </div>
      <div class="field">
        <div class="label-row">
          <label for="password">Password</label>
          <a href="{site}/forgot-password" target="_blank" rel="noopener">Forgot password?</a>
        </div>
        <input id="password" name="password" type="password" autocomplete="current-password"
               placeholder="Enter your password" required/>
      </div>
      <button class="btn-primary" type="submit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        Sign In
      </button>
    </form>
    <div class="divider"><span>Or continue with</span></div>
    <div class="social">
      <a href="/connector/login/social/google?state={st}" title="Google" aria-label="Continue with Google">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      </a>
      <a class="li" href="/connector/login/social/linkedin?state={st}" title="LinkedIn" aria-label="Continue with LinkedIn">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      </a>
      <a class="gh" href="/connector/login/social/github?state={st}" title="GitHub" aria-label="Continue with GitHub">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
    </div>
    <div class="foot">
      Don't have an account?
      <a href="{site}/signup" target="_blank" rel="noopener">Sign up</a>
    </div>
    <p class="note">You're authorizing Claude to access your resumes on 123Resume.</p>
  </main>
</body>
</html>"""
