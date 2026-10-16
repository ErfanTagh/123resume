"""
Inspect API error responses and uncaught exceptions; email operator.

Does not alter response bodies. See error_alerts for what an alert contains.
"""
import logging
import traceback

from . import error_alerts

logger = logging.getLogger(__name__)


class ErrorAlertMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        error_alerts.install_exception_catcher()

    def __call__(self, request):
        error_alerts.begin_request()
        try:
            response = self.get_response(request)
            try:
                self._maybe_alert_from_response(request, response)
            except Exception:
                logger.error("ErrorAlertMiddleware response hook failed")
            return response
        finally:
            error_alerts.end_request()

    def process_exception(self, request, exception):
        try:
            if error_alerts.should_alert(500, getattr(request, "path", "") or "", type(exception).__name__):
                ctx = error_alerts.collect_error_context(
                    request,
                    status=500,
                    exc=exception,
                    tb_text="".join(
                        traceback.format_exception(
                            type(exception), exception, exception.__traceback__
                        )
                    ),
                )
                error_alerts.notify_api_error(ctx)
                # The response hook will see the resulting 500; don't alert twice.
                request._error_alert_sent = True
        except Exception:
            logger.error("ErrorAlertMiddleware exception hook failed")
        return None

    def _maybe_alert_from_response(self, request, response):
        status = getattr(response, "status_code", None)
        if status is None or status < 400 or getattr(request, "_error_alert_sent", False):
            return

        path = getattr(request, "path", "") or ""
        exc = getattr(request, "_error_alert_exc", None)
        tb_text = getattr(request, "_error_alert_tb", "") or ""
        exc_type = type(exc).__name__ if exc is not None else ""

        if not error_alerts.should_alert(status, path, exc_type):
            return

        data = getattr(response, "data", None)
        if data is None and hasattr(response, "content"):
            try:
                data = response.content[:800].decode("utf-8", errors="replace")
            except Exception:
                data = None

        ctx = error_alerts.collect_error_context(
            request,
            status=status,
            exc=exc,
            tb_text=tb_text,
            response_data=data,
            sampled=status < 500,
        )
        error_alerts.notify_api_error(ctx)
