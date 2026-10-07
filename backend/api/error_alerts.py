"""
API error alerts emailed to the operator (Mailgun, background thread).

Always notify on HTTP 500+ / uncaught exceptions.
Sample 1-in-5 of other 4xx responses. Never blocks the request.
No DeepSeek — email contains technical details only.
"""
from __future__ import annotations

import hashlib
import html
import logging
import threading
import time
import traceback
from datetime import datetime, timezone

from django.conf import settings

from .email_verification import _send_with_mailgun

logger = logging.getLogger(__name__)

_COOLDOWN_SECONDS = 600
_cooldown_lock = threading.Lock()
_recent_fingerprints = {}


def _esc(value):
    return html.escape(str(value or ""))


def _alert_email():
    return (
        getattr(settings, "ERROR_ALERT_EMAIL", "")
        or getattr(settings, "ADMIN_NOTIFICATION_EMAIL", "")
    ).strip()


def _fingerprint(path, status, exc_type):
    raw = "%s|%s|%s" % (path, status, exc_type)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def _in_cooldown(fp):
    now = time.time()
    with _cooldown_lock:
        expired = [k for k, t in _recent_fingerprints.items() if now - t > _COOLDOWN_SECONDS]
        for k in expired:
            _recent_fingerprints.pop(k, None)
        last = _recent_fingerprints.get(fp)
        if last is not None and now - last < _COOLDOWN_SECONDS:
            return True
        _recent_fingerprints[fp] = now
        return False


def should_alert(status, path, exc_type=""):
    """True for all 5xx; 1-in-5 for other client/API errors (deterministic)."""
    if status is None or status < 400:
        return False
    if status >= 500:
        return True
    fp = _fingerprint(path, status, exc_type or "client")
    digest = hashlib.sha256(fp.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % 5 == 0


def _user_bits(request):
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return {
            "id": getattr(user, "id", None),
            "username": getattr(user, "username", "") or "",
            "email": getattr(user, "email", "") or "",
        }
    return {"id": None, "username": "anonymous", "email": ""}


def _client_meta(request):
    meta = getattr(request, "META", {}) or {}
    return {
        "client_path": (meta.get("HTTP_X_CLIENT_PATH") or "")[:300],
        "client_action": (meta.get("HTTP_X_CLIENT_ACTION") or "")[:200],
        "referer": (meta.get("HTTP_REFERER") or "")[:300],
        "user_agent": (meta.get("HTTP_USER_AGENT") or "")[:200],
    }


def collect_error_context(
    request,
    status,
    exc=None,
    tb_text="",
    response_snippet="",
    sampled=False,
):
    user = _user_bits(request)
    client = _client_meta(request)
    path = getattr(request, "path", "") or ""
    method = getattr(request, "method", "") or ""
    exc_type = type(exc).__name__ if exc is not None else ""
    exc_msg = str(exc)[:500] if exc is not None else ""
    if not tb_text and exc is not None:
        tb_text = "".join(
            traceback.format_exception(type(exc), exc, exc.__traceback__)
        )
    tb_text = (tb_text or "")[-4000:]
    return {
        "when_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "status": status,
        "method": method,
        "api_path": path,
        "user_id": user["id"],
        "username": user["username"],
        "user_email": user["email"],
        "client_path": client["client_path"],
        "client_action": client["client_action"],
        "referer": client["referer"],
        "user_agent": client["user_agent"],
        "exc_type": exc_type,
        "exc_msg": exc_msg,
        "traceback": tb_text,
        "response_snippet": (response_snippet or "")[:800],
        "sampled": sampled,
    }


def _build_email(ctx):
    who = ctx["username"] or "anonymous"
    if ctx.get("user_email"):
        who = "%s <%s>" % (who, ctx["user_email"])
    sample_tag = " [sampled 4xx]" if ctx.get("sampled") else ""
    subject = "[123Resume ERROR]%s %s %s %s — %s" % (
        sample_tag,
        ctx["status"],
        ctx["method"],
        ctx["api_path"],
        ctx["username"] or "anonymous",
    )

    lines = [
        "123Resume API error alert",
        "",
        "When (UTC):     %s" % ctx["when_utc"],
        "User:           %s" % who,
        "User id:        %s" % ctx.get("user_id"),
        "HTTP status:    %s" % ctx["status"],
        "API:            %s %s" % (ctx["method"], ctx["api_path"]),
        "Page (client):  %s" % (ctx.get("client_path") or "-"),
        "Action id:      %s" % (ctx.get("client_action") or "-"),
        "Referer:        %s" % (ctx.get("referer") or "-"),
        "User-Agent:     %s" % (ctx.get("user_agent") or "-"),
        "Exception:      %s %s" % (ctx.get("exc_type") or "-", ctx.get("exc_msg") or ""),
        "Sampled 4xx:    %s" % bool(ctx.get("sampled")),
        "",
        "Response snippet:",
        ctx.get("response_snippet") or "(none)",
        "",
        "Traceback (truncated):",
        ctx.get("traceback") or "(none)",
        "",
        "---",
        "123Resume error alerts",
    ]
    plain = "\n".join(lines)

    html_message = (
        "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head>"
        "<body style=\"font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"
        "background:#f4f4f4;margin:0;padding:16px;\">"
        "<table role=\"presentation\" style=\"width:100%;max-width:720px;margin:0 auto;"
        "background:#fff;border-radius:8px;\"><tr><td style=\"padding:20px 24px;"
        "border-left:5px solid #dc2626;\">"
        "<p style=\"margin:0 0 12px;font-size:18px;font-weight:700;color:#b91c1c;\">"
        "API error__SAMPLE__</p>"
        "<pre style=\"white-space:pre-wrap;font-size:13px;line-height:1.45;"
        "color:#111;margin:0;\">__PLAIN__</pre>"
        "</td></tr></table></body></html>"
    ).replace("__SAMPLE__", _esc(sample_tag)).replace("__PLAIN__", _esc(plain))
    return subject, plain, html_message


def notify_api_error(ctx):
    """Fire-and-forget email with technical details. Never raises to callers."""
    recipient = _alert_email()
    if not recipient:
        return

    path = ctx.get("api_path") or ""
    status = int(ctx.get("status") or 0)
    exc_type = ctx.get("exc_type") or ""
    fp = _fingerprint(
        path,
        status,
        exc_type or ("server" if status >= 500 else "client"),
    )
    if _in_cooldown(fp):
        return

    def _send():
        try:
            subject, plain, html_message = _build_email(ctx)
            ok = _send_with_mailgun(
                subject=subject,
                plain_message=plain,
                html_message=html_message,
                to_email=recipient,
            )
            if not ok:
                logger.error(
                    "Error alert email failed to send (status=%s path=%s)",
                    status,
                    path,
                )
        except Exception as e:
            logger.error("Error alert email exception: %s", type(e).__name__)

    try:
        threading.Thread(target=_send, daemon=True).start()
    except Exception as e:
        logger.error("Could not start error-alert thread: %s", type(e).__name__)
