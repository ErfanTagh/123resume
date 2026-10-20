"""
URL configuration for resume backend project.
"""
from django.contrib import admin
from django.urls import path, include

from api.metrics import metrics_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # Prometheus only; not routed by the public gateway (see api/metrics.py).
    path('internal/metrics', metrics_view),
]

