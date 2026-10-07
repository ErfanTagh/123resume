"""DRF exception handler that stashes exception info for error alerts."""
import traceback

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get("request")
    if request is not None:
        request._error_alert_exc = exc
        request._error_alert_tb = "".join(
            traceback.format_exception(type(exc), exc, exc.__traceback__)
        )
    return response
