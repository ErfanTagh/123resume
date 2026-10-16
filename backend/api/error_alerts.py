"""
API error alerts emailed to the operator (Mailgun, background thread).

Always notify on HTTP 500+ / uncaught exceptions; sample 1-in-5 of other 4xx.
Never blocks the request.

An alert should answer, at a glance: what broke (in plain words, with the
likely cause for errors we have seen before), how often and since when, whether
a real user or a crawler hit it, and how to reproduce it. Views that catch an
exception and return a 500 themselves leave no exception for the middleware;
their traceback is still captured when the view logs it (logger.exception).
"""
from __future__ import annotations

import hashlib
import html
import json
import logging
import re
import socket
import threading
import time
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from django.conf import settings
from django.core.cache import cache

from .email_verification import _send_with_mailgun

logger = logging.getLogger(__name__)

SITE_URL = "https://123resume.de"
_COOLDOWN_SECONDS = 600
_WINDOW_SECONDS = 24 * 60 * 60

try:
    from zoneinfo import ZoneInfo

    _BERLIN = ZoneInfo("Europe/Berlin")
except Exception:  # pragma: no cover - tzdata missing
    _BERLIN = None


# --------------------------------------------------------------------------
# Per-request state: start time + the first exception a view logged
# --------------------------------------------------------------------------

_local = threading.local()


class _LoggedExceptionCatcher(logging.Handler):
    """Remembers the first exception logged (with exc_info) during a request."""

    def emit(self, record: logging.LogRecord) -> None:
        if not getattr(_local, "active", False) or getattr(_local, "exc", None) or not record.exc_info:
            return
        exc_type, exc, tb = record.exc_info
        if exc is None:
            return
        _local.exc = exc
        _local.tb = "".join(traceback.format_exception(exc_type, exc, tb))


_catcher_installed = False


def install_exception_catcher() -> None:
    global _catcher_installed
    if not _catcher_installed:
        handler = _LoggedExceptionCatcher(level=logging.ERROR)
        # Root for everything else; "api" too, because it doesn't propagate to root.
        # A record reaches only one of the two, so nothing is caught twice.
        logging.getLogger().addHandler(handler)
        logging.getLogger("api").addHandler(handler)
        _catcher_installed = True


def begin_request() -> None:
    _local.active = True
    _local.started = time.monotonic()
    _local.exc = None
    _local.tb = ""


def end_request() -> None:
    _local.active = False
    _local.exc = None
    _local.tb = ""


def logged_exception():
    """(exception, traceback text) a view logged during this request, if any."""
    return getattr(_local, "exc", None), getattr(_local, "tb", "") or ""


def request_duration_ms() -> Optional[int]:
    started = getattr(_local, "started", None)
    return int((time.monotonic() - started) * 1000) if started else None


# --------------------------------------------------------------------------
# Making sense of the error
# --------------------------------------------------------------------------

# (pattern, what broke, what to check). First match wins.
_KNOWN_CAUSES = [
    (r"AuthenticationFailed|Authentication failed",
     "MongoDB rejected the database login",
     "Check the MongoDB credentials in the server .env (MONGODB_CONNECTION_STRING, "
     "MONGODB_USERNAME / MONGODB_PASSWORD) against the database user."),
    (r"requires authentication",
     "Connected to MongoDB without a login",
     "The code fell back to an unauthenticated connection; the MongoDB credentials in .env are missing or wrong."),
    (r"ServerSelectionTimeout|No servers found|Connection refused|Name or service not known",
     "The database could not be reached",
     "Is resume_mongodb running? `docker ps`, then `docker logs resume_mongodb --tail 50`."),
    (r"credit balance|billing|insufficient_quota",
     "The AI account is out of credit",
     "Top up or check billing for the AI provider (AI_PROVIDER in .env)."),
    (r"invalid x-api-key|AuthenticationError|anthropic-workspace-id|Incorrect API key",
     "The AI provider rejected the API key",
     "Check ANTHROPIC_API_KEY (or DEEPSEEK_API_KEY) in the server .env."),
    (r"RateLimitError|rate.?limit|\b429\b",
     "The AI provider is rate-limiting us",
     "Short bursts recover by themselves; if it keeps happening, check the usage limits of the API key."),
    (r"overloaded|\b529\b|InternalServerError.*anthropic",
     "The AI provider is overloaded",
     "Usually temporary on the provider's side."),
    (r"APITimeoutError|timed out|ReadTimeout|TimeoutError",
     "A call timed out",
     "Often the AI provider or Mailgun being slow; see the traceback for which call."),
    (r"JSONDecodeError|Expecting value|Unterminated string",
     "Got invalid JSON back (usually from the AI)",
     "The model reply was cut off or not JSON; check max_tokens for that feature."),
    (r"[Mm]ailgun",
     "Sending email through Mailgun failed",
     "Check MAILGUN_API_KEY / MAILGUN_DOMAIN and the daily sending cap."),
    (r"\b(KeyError|TypeError|AttributeError|IndexError|ValueError|NameError)\b",
     "A bug in our code",
     "See the traceback for the line."),
]

_BOT_RE = re.compile(
    r"(Googlebot|bingbot|Applebot|DuckDuckBot|YandexBot|Baiduspider|AhrefsBot|SemrushBot|"
    r"facebookexternalhit|Twitterbot|LinkedInBot|GPTBot|ClaudeBot|PerplexityBot|"
    r"bot\b|crawler|spider|curl/|python-requests)",
    re.IGNORECASE,
)

_ID_IN_PATH = re.compile(r"/(?:[0-9a-f]{24}|\d+|[0-9a-f-]{36})(?=/|$)", re.IGNORECASE)


def _esc(value: Any) -> str:
    return html.escape(str(value if value is not None else ""))


def _error_text_from_response(data: Any) -> str:
    """The human-readable error a view put in its response body."""
    if isinstance(data, dict):
        for key in ("error", "detail", "message"):
            if data.get(key):
                return str(data[key])
        return json.dumps(data, default=str)[:600]
    if isinstance(data, (list, tuple)):
        return json.dumps(data, default=str)[:600]
    return str(data or "")


def diagnose(text: str) -> Optional[Dict[str, str]]:
    for pattern, what, check in _KNOWN_CAUSES:
        if re.search(pattern, text or ""):
            return {"what": what, "check": check}
    return None


def visitor_kind(user_agent: str) -> str:
    m = _BOT_RE.search(user_agent or "")
    return f"{m.group(1)} (crawler, not a real user)" if m else "browser"


def _fingerprint(path: str, status: int, kind: str) -> str:
    raw = "%s|%s|%s" % (_ID_IN_PATH.sub("/:id", path or ""), status, kind)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


# --------------------------------------------------------------------------
# Which errors alert, and how often
# --------------------------------------------------------------------------

def should_alert(status, path, exc_type=""):
    """True for all 5xx; 1-in-5 for other client/API errors (deterministic)."""
    if status is None or status < 400:
        return False
    if status >= 500:
        return True
    fp = _fingerprint(path, status, exc_type or "client")
    digest = hashlib.sha256(fp.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 5 == 0


def _record_occurrence(fp: str) -> Dict[str, Any]:
    """
    Count this error in the shared (file) cache, so all gunicorn workers see the
    same numbers. Returns the updated record plus whether to email now.
    Not atomic; an occasional miscount under concurrency is fine for alerts.
    """
    now = time.time()
    key = f"erralert:{fp}"
    try:
        rec = cache.get(key) or {}
    except Exception:
        rec = {}
    if not rec or now - rec.get("first", now) > _WINDOW_SECONDS:
        rec = {"first": now, "count": 0, "last_sent": 0.0, "suppressed": 0}
    rec["count"] += 1
    send = now - rec.get("last_sent", 0.0) >= _COOLDOWN_SECONDS
    suppressed_before = rec.get("suppressed", 0)
    if send:
        rec["last_sent"] = now
        rec["suppressed"] = 0
    else:
        rec["suppressed"] = suppressed_before + 1
    try:
        cache.set(key, rec, _WINDOW_SECONDS)
    except Exception:
        pass
    return {**rec, "send": send, "suppressed_before": suppressed_before}


# --------------------------------------------------------------------------
# Building the alert
# --------------------------------------------------------------------------

def _user_bits(request):
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return {
            "id": getattr(user, "id", None),
            "username": getattr(user, "username", "") or "",
            "email": getattr(user, "email", "") or "",
        }
    return {"id": None, "username": "", "email": ""}


def collect_error_context(
    request,
    status,
    exc=None,
    tb_text="",
    response_data=None,
    sampled=False,
):
    meta = getattr(request, "META", {}) or {}
    user = _user_bits(request)

    logged_exc, logged_tb = logged_exception()
    if exc is None and logged_exc is not None:
        exc, tb_text = logged_exc, logged_tb
    if not tb_text and exc is not None:
        tb_text = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))

    error_text = str(exc)[:600] if exc is not None else ""
    response_error = _error_text_from_response(response_data)[:600] if response_data is not None else ""
    path = getattr(request, "path", "") or ""
    query = meta.get("QUERY_STRING") or ""
    now = datetime.now(timezone.utc)

    return {
        "when_utc": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "when_berlin": now.astimezone(_BERLIN).strftime("%H:%M %Z") if _BERLIN else "",
        "status": status,
        "method": getattr(request, "method", "") or "",
        "api_path": path,
        "query": query[:300],
        "duration_ms": request_duration_ms(),
        "user_id": user["id"],
        "username": user["username"],
        "user_email": user["email"],
        "client_ip": (meta.get("HTTP_X_REAL_IP") or meta.get("REMOTE_ADDR") or "")[:64],
        "client_path": (meta.get("HTTP_X_CLIENT_PATH") or "")[:300],
        "client_action": (meta.get("HTTP_X_CLIENT_ACTION") or "")[:200],
        "referer": (meta.get("HTTP_REFERER") or "")[:300],
        "user_agent": (meta.get("HTTP_USER_AGENT") or "")[:300],
        "exc_type": type(exc).__name__ if exc is not None else "",
        "error_text": error_text,
        "response_error": response_error,
        "traceback": (tb_text or "")[-4000:],
        "sampled": sampled,
        "server": socket.gethostname(),
    }


def _summary_line(ctx) -> str:
    text = ctx.get("response_error") or ctx.get("error_text") or ""
    return re.sub(r",? full error: \{.*", "", text).strip()[:160]


def _build_email(ctx, occurrences):
    diagnosis = diagnose(" ".join([ctx.get("exc_type", ""), ctx.get("error_text", ""), ctx.get("response_error", "")]))
    headline = diagnosis["what"] if diagnosis else (_summary_line(ctx) or f"HTTP {ctx['status']}")
    endpoint = f"{ctx['method']} {ctx['api_path']}"
    sample_tag = " [sampled 4xx]" if ctx.get("sampled") else ""
    subject = f"[123Resume]{sample_tag} {ctx['status']} {endpoint}: {headline}"[:180]

    who = "anonymous"
    if ctx.get("username"):
        who = ctx["username"] + (f" <{ctx['user_email']}>" if ctx.get("user_email") else "") + f" (id {ctx['user_id']})"
    visitor = visitor_kind(ctx.get("user_agent", ""))

    first = datetime.fromtimestamp(occurrences["first"], timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    count = occurrences["count"]
    impact = f"{count} time{'s' if count != 1 else ''} in the last 24 h, first at {first}"
    if occurrences.get("suppressed_before"):
        impact += f" ({occurrences['suppressed_before']} more since the last alert)"

    url = SITE_URL + ctx["api_path"] + (f"?{ctx['query']}" if ctx.get("query") else "")
    curl = f"curl -i '{url}'" if ctx["method"] == "GET" else f"curl -i -X {ctx['method']} '{url}'"
    duration = f"{ctx['duration_ms']} ms" if ctx.get("duration_ms") is not None else "-"
    error_shown = ctx.get("response_error") or ctx.get("error_text") or "(no error text)"
    if ctx.get("traceback"):
        tb_note = ctx["traceback"]
    else:
        tb_note = ("(none: the view caught the error and returned the response itself without logging it; "
                   "the error text above is all it gave)")

    rows = [
        ("When", f"{ctx['when_utc']}" + (f"  ({ctx['when_berlin']} Berlin)" if ctx.get("when_berlin") else "")),
        ("How often", impact),
        ("Who", f"{who}, {visitor}"),
        ("Request", f"{endpoint}" + (f"?{ctx['query']}" if ctx.get("query") else "") + f"  ({duration})"),
        ("From page", ctx.get("client_path") or ctx.get("referer") or "-"),
        ("Last click", ctx.get("client_action") or "-"),
        ("Client", f"{ctx.get('client_ip') or '-'}  {ctx.get('user_agent') or ''}".strip()),
        ("Server", ctx.get("server") or "-"),
    ]

    lines = [
        f"{headline}",
        f"{ctx['status']} on {endpoint}",
        "",
    ]
    if diagnosis:
        lines += [f"What to check: {diagnosis['check']}", ""]
    lines += ["Error:", error_shown, ""]
    lines += [f"{label + ':':<12} {value}" for label, value in rows]
    lines += ["", f"Reproduce:   {curl}", "", "Traceback:", tb_note, "", "123Resume error alerts"]
    plain = "\n".join(lines)

    row_html = "".join(
        f'<tr><td style="padding:3px 12px 3px 0;color:#64748b;white-space:nowrap;vertical-align:top;">{_esc(label)}</td>'
        f'<td style="padding:3px 0;color:#0f172a;word-break:break-word;">{_esc(value)}</td></tr>'
        for label, value in rows
    )
    check_html = (
        f'<p style="margin:12px 0 0;padding:10px 12px;background:#fef3c7;border-radius:6px;color:#78350f;font-size:14px;">'
        f'<b>What to check:</b> {_esc(diagnosis["check"])}</p>'
        if diagnosis else ""
    )
    html_message = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:16px;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" style="width:100%;max-width:720px;margin:0 auto;background:#fff;border-radius:10px;border-left:5px solid #dc2626;">
<tr><td style="padding:20px 24px;">
  <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#b91c1c;">{_esc(ctx['status'])} on {_esc(endpoint)}{_esc(sample_tag)}</p>
  <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#0f172a;">{_esc(headline)}</p>
  {check_html}
  <p style="margin:16px 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Error</p>
  <pre style="margin:0;padding:10px 12px;background:#f8fafc;border-radius:6px;white-space:pre-wrap;font-size:13px;color:#0f172a;">{_esc(error_shown)}</pre>
  <table role="presentation" style="margin-top:16px;font-size:14px;border-collapse:collapse;">{row_html}</table>
  <p style="margin:16px 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Reproduce</p>
  <pre style="margin:0;padding:10px 12px;background:#0f172a;color:#e2e8f0;border-radius:6px;white-space:pre-wrap;font-size:13px;">{_esc(curl)}</pre>
  <p style="margin:16px 0 4px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;">Traceback</p>
  <pre style="margin:0;padding:10px 12px;background:#f8fafc;border-radius:6px;white-space:pre-wrap;font-size:12px;color:#334155;">{_esc(tb_note)}</pre>
</td></tr></table>
<p style="text-align:center;font-size:12px;color:#94a3b8;">123Resume error alerts</p>
</body></html>"""
    return subject, plain, html_message


def _alert_email():
    return (getattr(settings, "ERROR_ALERT_EMAIL", "") or getattr(settings, "ADMIN_NOTIFICATION_EMAIL", "")).strip()


def notify_api_error(ctx):
    """Fire-and-forget email with technical details. Never raises to callers."""
    recipient = _alert_email()
    if not recipient:
        return

    status = int(ctx.get("status") or 0)
    diagnosis = diagnose(" ".join([ctx.get("exc_type", ""), ctx.get("error_text", ""), ctx.get("response_error", "")]))
    kind = ctx.get("exc_type") or (diagnosis["what"] if diagnosis else _summary_line(ctx)[:60]) or "unknown"
    occurrences = _record_occurrence(_fingerprint(ctx.get("api_path") or "", status, kind))
    if not occurrences["send"]:
        return

    def _send():
        try:
            subject, plain, html_message = _build_email(ctx, occurrences)
            ok = _send_with_mailgun(
                subject=subject,
                plain_message=plain,
                html_message=html_message,
                to_email=recipient,
            )
            if not ok:
                logger.error("Error alert email failed to send (status=%s path=%s)", status, ctx.get("api_path"))
        except Exception as e:
            logger.error("Error alert email exception: %s", type(e).__name__)

    try:
        threading.Thread(target=_send, daemon=True).start()
    except Exception as e:
        logger.error("Could not start error-alert thread: %s", type(e).__name__)
