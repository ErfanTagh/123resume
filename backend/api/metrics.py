"""
Prometheus metrics for the admin dashboards (Grafana at /grafana/).

  - every API request: route, method, status, duration
  - every AI call: feature, model, outcome, duration, tokens
  - business totals (users, resumes), read from the database at scrape time

Served at /internal/metrics for Prometheus on the Docker network. The public
gateway only forwards /api/ and /admin/ to the backend, and the view refuses
anything that came through a proxy, so it is not reachable from outside.

gunicorn runs several worker processes, so counters are kept in
PROMETHEUS_MULTIPROC_DIR (prometheus_client multiprocess mode) and merged
when scraped. That directory must be emptied when the backend starts.
"""
from __future__ import annotations

import logging
import os
import time

from django.http import Http404, HttpResponse
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    REGISTRY,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
    multiprocess,
)
from prometheus_client.core import GaugeMetricFamily

logger = logging.getLogger(__name__)

HTTP_REQUESTS = Counter(
    "resume_http_requests_total",
    "API requests by route, method and status code",
    ["route", "method", "status"],
)
HTTP_DURATION = Histogram(
    "resume_http_request_duration_seconds",
    "API request duration",
    ["route", "method"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
)
AI_REQUESTS = Counter(
    "resume_ai_requests_total",
    "AI calls by feature, model and outcome (ok, refusal, truncated, or the error type)",
    ["feature", "model", "outcome"],
)
AI_DURATION = Histogram(
    "resume_ai_request_duration_seconds",
    "AI call duration",
    ["feature", "model"],
    buckets=(1, 2, 4, 6, 8, 12, 20, 30, 60),
)
AI_TOKENS = Counter(
    "resume_ai_tokens_total",
    "AI tokens by feature, model and kind (input/output)",
    ["feature", "model", "kind"],
)

_METRICS_ROUTE = "internal/metrics"


# --------------------------------------------------------------------------
# Requests
# --------------------------------------------------------------------------

class MetricsMiddleware:
    """Counts and times every request, labelled by its URL pattern (not the raw
    path, so /api/resumes/<id>/ is one series, not one per resume)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.monotonic()
        response = self.get_response(request)
        try:
            match = getattr(request, "resolver_match", None)
            route = match.route if match is not None else "unmatched"
            if route != _METRICS_ROUTE:
                method = request.method or ""
                HTTP_REQUESTS.labels(route, method, str(response.status_code)).inc()
                HTTP_DURATION.labels(route, method).observe(time.monotonic() - started)
        except Exception:
            logger.warning("metrics: could not record request", exc_info=True)
        return response


# --------------------------------------------------------------------------
# AI calls (recorded by the client wrapper in deepseek_chat)
# --------------------------------------------------------------------------

def observe_ai_call(feature: str, model: str, seconds: float, outcome: str, usage=None) -> None:
    try:
        AI_REQUESTS.labels(feature, model, outcome).inc()
        AI_DURATION.labels(feature, model).observe(seconds)
        if usage is not None:
            AI_TOKENS.labels(feature, model, "input").inc(getattr(usage, "prompt_tokens", 0) or 0)
            AI_TOKENS.labels(feature, model, "output").inc(getattr(usage, "completion_tokens", 0) or 0)
    except Exception:
        logger.warning("metrics: could not record AI call", exc_info=True)


# --------------------------------------------------------------------------
# Business totals, computed when Prometheus scrapes
# --------------------------------------------------------------------------

class _BusinessCollector:
    def collect(self):
        from .views.match_views import _get_mongo_db

        try:
            # Straight from MongoDB: djongo can't translate filter(is_active=...).
            auth_users = _get_mongo_db().auth_user
            users = GaugeMetricFamily("resume_users", "Registered users", labels=["state"])
            users.add_metric(["active"], auth_users.count_documents({"is_active": True}))
            users.add_metric(["unverified"], auth_users.count_documents({"is_active": False}))
            yield users
        except Exception:
            logger.warning("metrics: could not count users", exc_info=True)
        try:
            resumes = GaugeMetricFamily("resume_resumes", "Saved resumes")
            resumes.add_metric([], _get_mongo_db().resumes.estimated_document_count())
            yield resumes
        except Exception:
            logger.warning("metrics: could not count resumes", exc_info=True)


def metrics_view(request):
    # nginx sets these on everything it forwards; a scrape from inside the
    # Docker network has neither.
    if request.META.get("HTTP_X_REAL_IP") or request.META.get("HTTP_X_FORWARDED_FOR"):
        raise Http404()

    if os.environ.get("PROMETHEUS_MULTIPROC_DIR"):
        app_registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(app_registry)
    else:
        app_registry = REGISTRY
    business_registry = CollectorRegistry()
    business_registry.register(_BusinessCollector())

    body = generate_latest(app_registry) + generate_latest(business_registry)
    return HttpResponse(body, content_type=CONTENT_TYPE_LATEST)
