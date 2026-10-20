"""
Generates monitoring/grafana/dashboards/123resume-overview.json.

    python3 monitoring/grafana/make_dashboard.py monitoring/grafana/dashboards/123resume-overview.json

Edit this file, not the JSON: Grafana loads the JSON read-only.
"""
import json
import sys

DS = {"type": "prometheus", "uid": "prometheus"}

# Validated categorical order (dataviz reference palette), assigned to AI
# features in a fixed order so a feature keeps its colour across panels.
FEATURE_COLORS = [
    ("scoring", "#2a78d6"), ("improve", "#eb6834"), ("parsing", "#1baf7a"),
    ("translate", "#eda100"), ("tailor", "#e87ba4"), ("cover_letter", "#008300"),
    ("job_match", "#6250d6"), ("work_bullet", "#e34948"),
]
OTHER_GRAY = "#8a8f98"
STATUS = {"good": "#0ca30c", "warning": "#fab219", "critical": "#d03b3b"}

def counted(metric, window, matchers=""):
    """
    How much a counter grew within `window`, per series, *including* each new
    series' first events.

    increase() needs a sample before an event to see it, so a counter that first
    appears already at 1 (a new route/status/feature, or any series after a
    deploy restarts the counters) would count 0. At our traffic that is most
    errors and AI calls. A series that did not exist at the start of the window
    got all of its value inside the window, so take its value whole; for the
    rest, increase(). "+ 0" drops the metric name so `or` matches the label sets.
    """
    m = f"{metric}{{{matchers}}}" if matchers else metric
    return f"((({m} unless {m} offset {window}) + 0) or increase({m}[{window}]))"


panels = []
_next_id = [1]


def pid():
    _next_id[0] += 1
    return _next_id[0]


def target(expr, legend="", instant=False, fmt=None):
    t = {"datasource": DS, "expr": expr, "legendFormat": legend, "refId": "A"}
    if instant:
        t.update({"instant": True, "range": False})
    if fmt:
        t["format"] = fmt
    return t


def by_name(name, color):
    return {"matcher": {"id": "byName", "options": name},
            "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": color}}]}


def row(title, y):
    panels.append({"type": "row", "title": title, "id": pid(), "collapsed": False,
                   "gridPos": {"h": 1, "w": 24, "x": 0, "y": y}, "panels": []})


def stat(title, expr, x, y, w=4, unit="short", decimals=0, description=""):
    panels.append({
        "type": "stat", "title": title, "id": pid(), "datasource": DS, "description": description,
        "gridPos": {"h": 4, "w": w, "x": x, "y": y},
        "targets": [target(expr, instant=True)],
        "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
                    "colorMode": "none", "graphMode": "none", "textMode": "value", "justifyMode": "center"},
        "fieldConfig": {"defaults": {"unit": unit, "decimals": decimals, "noValue": "0"}, "overrides": []},
    })


def bars(title, targets_, x, y, w, h, interval, overrides, default_color=None, unit="short", description=""):
    defaults = {
        "unit": unit, "min": 0,
        "custom": {"drawStyle": "bars", "fillOpacity": 85, "lineWidth": 0, "stacking": {"mode": "normal", "group": "A"},
                   "barAlignment": 0, "showPoints": "never", "axisSoftMin": 0},
    }
    if default_color:
        defaults["color"] = {"mode": "fixed", "fixedColor": default_color}
    panels.append({
        "type": "timeseries", "title": title, "id": pid(), "datasource": DS, "interval": interval,
        "description": description, "gridPos": {"h": h, "w": w, "x": x, "y": y},
        "targets": targets_,
        "options": {"legend": {"displayMode": "list", "placement": "bottom", "showLegend": True},
                    "tooltip": {"mode": "multi", "sort": "desc"}},
        "fieldConfig": {"defaults": defaults, "overrides": overrides},
    })


def lines(title, targets_, x, y, w, h, unit="short", interval=None, overrides=None, default_color=None,
          thresholds=None, description=""):
    defaults = {"unit": unit, "min": 0,
                "custom": {"drawStyle": "line", "lineWidth": 2, "fillOpacity": 0, "showPoints": "never",
                           "spanNulls": True}}
    if default_color:
        defaults["color"] = {"mode": "fixed", "fixedColor": default_color}
    if thresholds:
        defaults["thresholds"] = thresholds
        defaults["custom"]["thresholdsStyle"] = {"mode": "line+area"}
    p = {"type": "timeseries", "title": title, "id": pid(), "datasource": DS, "description": description,
         "gridPos": {"h": h, "w": w, "x": x, "y": y}, "targets": targets_,
         "options": {"legend": {"displayMode": "list", "placement": "bottom", "showLegend": len(targets_) > 1 or bool(overrides)},
                     "tooltip": {"mode": "multi", "sort": "desc"}},
         "fieldConfig": {"defaults": defaults, "overrides": overrides or []}}
    if interval:
        p["interval"] = interval
    panels.append(p)


def table(title, expr, x, y, w, h, value_name, unit="short", decimals=0, description=""):
    panels.append({
        "type": "table", "title": title, "id": pid(), "datasource": DS, "description": description,
        "gridPos": {"h": h, "w": w, "x": x, "y": y},
        "targets": [target(expr, instant=True, fmt="table")],
        "transformations": [{"id": "organize", "options": {"excludeByName": {"Time": True},
                                                           "renameByName": {"Value": value_name}}}],
        "options": {"showHeader": True, "sortBy": [{"displayName": value_name, "desc": True}]},
        "fieldConfig": {"defaults": {"unit": unit, "decimals": decimals}, "overrides": []},
    })


feature_overrides = [by_name(f, c) for f, c in FEATURE_COLORS]
PCT_THRESHOLDS = {"mode": "absolute", "steps": [{"color": "transparent", "value": None},
                                                 {"color": STATUS["warning"], "value": 80},
                                                 {"color": STATUS["critical"], "value": 90}]}
def cost(window):
    """Estimated $ from tokens at Claude Sonnet 5.5 list prices ($2 in / $10 out per 1M)."""
    tokens_in = counted("resume_ai_tokens_total", window, 'kind="input"')
    tokens_out = counted("resume_ai_tokens_total", window, 'kind="output"')
    return f"((sum({tokens_in}) or vector(0)) * 2 + (sum({tokens_out}) or vector(0)) * 10) / 1e6"

# --- Headline -------------------------------------------------------------
y = 0
row("At a glance (selected time range)", y); y += 1
stat("Active users", 'sum(resume_users{state="active"})', 0, y)
stat("User growth", 'max_over_time(sum(resume_users)[$__range:10m]) - min_over_time(sum(resume_users)[$__range:10m])',
     4, y, description="Registered users at the end of the range minus the start (deleted accounts lower it).")
stat("Saved resumes", "sum(resume_resumes)", 8, y)
stat("Server errors (5xx)", f'sum({counted("resume_http_requests_total", "$__range", 'status=~"5.."')})', 12, y,
     description="API responses with status 500-599. Each one also sends an alert email.")
stat("AI calls", f'sum({counted("resume_ai_requests_total", "$__range")})', 16, y)
stat("AI cost (est.)", cost("$__range"), 20, y, unit="currencyUSD", decimals=2,
     description="Tokens x Claude Sonnet 5.5 list prices ($2 input / $10 output per million). Approximate.")
y += 4

# --- Traffic --------------------------------------------------------------
row("Traffic", y); y += 1
status_class = ('sum by (class) (label_replace(' + counted("resume_http_requests_total", "$__interval") +
                ', "class", "${1}xx", "status", "(.).."))')
bars("API requests per 6 hours, by result", [target(status_class, "{{class}}")], 0, y, 12, 8, "6h",
     [by_name("2xx", STATUS["good"]), by_name("3xx", OTHER_GRAY), by_name("4xx", STATUS["warning"]),
      by_name("5xx", STATUS["critical"])],
     description="2xx ok, 4xx rejected requests (e.g. not logged in, bad input), 5xx server errors.")
table("Failing endpoints", f'sort_desc(sum by (route, status) ({counted("resume_http_requests_total", "$__range", 'status=~"[45].."')})) > 0',
      12, y, 12, 8, "Requests")
y += 8
table("Slowest endpoints (p95)", 'topk(10, histogram_quantile(0.95, sum by (le, route) (rate(resume_http_request_duration_seconds_bucket[$__range]))))',
      0, y, 12, 8, "p95", unit="s", decimals=2, description="95% of requests to this endpoint were faster than this.")
table("Busiest endpoints", f'topk(10, sum by (route) ({counted("resume_http_requests_total", "$__range")}))',
      12, y, 12, 8, "Requests")
y += 8

# --- AI -------------------------------------------------------------------
row("AI (Claude)", y); y += 1
bars("AI calls per 6 hours, by feature", [target(f'sum by (feature) ({counted("resume_ai_requests_total", "$__interval")})', "{{feature}}")],
     0, y, 12, 8, "6h", feature_overrides, default_color=OTHER_GRAY)
lines("AI response time (p95), by feature",
      [target("histogram_quantile(0.95, sum by (le, feature) (rate(resume_ai_request_duration_seconds_bucket[$__interval])))", "{{feature}}")],
      12, y, 12, 8, unit="s", interval="6h", overrides=feature_overrides, default_color=OTHER_GRAY,
      description="95% of calls for that feature finished faster than this. Users wait for these.")
y += 8
bars("AI cost per day (est.)", [target(cost("$__interval"), "cost")], 0, y, 12, 8, "1d", [],
     default_color="#2a78d6", unit="currencyUSD")
table("AI failures", f'sort_desc(sum by (feature, outcome) ({counted("resume_ai_requests_total", "$__range", 'outcome!="ok"')})) > 0',
      12, y, 12, 8, "Calls", description="refusal = the model declined; truncated = hit max_tokens; anything else is the error type.")
y += 8

# --- Growth ---------------------------------------------------------------
row("Users and resumes", y); y += 1
lines("Registered users", [target("sum(resume_users)", "users")], 0, y, 12, 7, interval="1h", default_color="#2a78d6")
lines("Saved resumes", [target("sum(resume_resumes)", "resumes")], 12, y, 12, 7, interval="1h", default_color="#2a78d6")
y += 7

# --- Server ---------------------------------------------------------------
row("Server", y); y += 1
lines("CPU used", [target('100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[$__rate_interval])))', "cpu")],
      0, y, 8, 7, unit="percent", default_color="#2a78d6", thresholds=PCT_THRESHOLDS)
lines("Memory used", [target("100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)", "memory")],
      8, y, 8, 7, unit="percent", default_color="#2a78d6", thresholds=PCT_THRESHOLDS)
lines("Disk used", [target('100 * (1 - node_filesystem_avail_bytes{mountpoint="/", fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{mountpoint="/", fstype!~"tmpfs|overlay"})', "disk /")],
      16, y, 8, 7, unit="percent", default_color="#2a78d6", thresholds=PCT_THRESHOLDS)

dashboard = {
    "uid": "resume-overview", "title": "123Resume overview", "tags": ["123resume"],
    "timezone": "Europe/Berlin", "schemaVersion": 41, "version": 1, "editable": False,
    "time": {"from": "now-7d", "to": "now"}, "refresh": "5m",
    "timepicker": {"refresh_intervals": ["5m", "15m", "1h"]},
    "panels": panels,
}
json.dump(dashboard, open(sys.argv[1], "w"), indent=2)
print("panels:", len(panels))
