"""
Inspect API error responses and uncaught exceptions; email operator.

Does not alter response bodies. DeepSeek is intentionally not used.
"""
import logging
import traceback

from . import error_alerts

logger = logging.getLogger(__name__)


class ErrorAlertMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        try:
            self._maybe_alert_from_response(request, response)
        except Exception:
            logger.error("ErrorAlertMiddleware response hook failed")
        return response

    def process_exception(self, request, exception):
        try:
            ctx = error_alerts.collect_error_context(
                request,
                status=500,
                exc=exception,
                tb_text="".join(
                    traceback.format_exception(
                        type(exception), exception, exception.__traceback__
                    )
                ),
                sampled=False,
            )
            if error_alerts.should_alert(500, getattr(request, "path", "") or "", type(exception).__name__):
                error_alerts.notify_api_error(ctx)
        except Exception:
            logger.error("ErrorAlertMiddleware exception hook failed")
        return None

    def _maybe_alert_from_response(self, request, response):
        status = getattr(response, "status_code", None)
        if status is None or status < 400:
            return

        path = getattr(request, "path", "") or ""
        exc = getattr(request, "_error_alert_exc", None)
        tb_text = getattr(request, "_error_alert_tb", "") or ""
        exc_type = type(exc).__name__ if exc is not None else ""

        sampled = status < 500
        if not error_alerts.should_alert(status, path, exc_type):
            return

        snippet = ""
        try:
            if hasattr(response, "data"):
                snippet = str(response.data)[:800]
            elif hasattr(response, "content"):
                snippet = response.content[:800].decode("utf-8", errors="replace")
        except Exception:
            snippet = ""

        ctx = error_alerts.collect_error_context(
            request,
            status=status,
            exc=exc,
            tb_text=tb_text,
            response_snippet=snippet,
            sampled=sampled,
        )
        error_alerts.notify_api_error(ctx)
