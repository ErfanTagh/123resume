#!/usr/bin/env bash
# Watch public HTTPS health through gateway_nginx and email on failure.
# Runs on the HOST (not inside resume_backend) so alerts still fire when the
# backend container is down or nginx returns 502 HTML.
#
# Cron example (every minute):
#   * * * * * /root/my-simple-resume/scripts/check_gateway_health.sh >>/var/log/gateway_health_alert.log 2>&1
#
# Env (from project .env): ERROR_ALERT_EMAIL, MAILGUN_API_KEY, MAILGUN_DOMAIN,
# optional MAILGUN_BASE_URL, GATEWAY_HEALTH_URL, GATEWAY_ALERT_COOLDOWN_SECONDS
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/my-simple-resume}"
ENV_FILE="${ENV_FILE:-$PROJECT_DIR/.env}"
STATE_DIR="${STATE_DIR:-/var/tmp/123resume-gateway-health}"
COOLDOWN_FILE="$STATE_DIR/last_alert_ts"
FORCE_ALERT=0

for arg in "$@"; do
  case "$arg" in
    --force-alert) FORCE_ALERT=1 ;;
    -h|--help)
      echo "Usage: $0 [--force-alert]"
      exit 0
      ;;
  esac
done

mkdir -p "$STATE_DIR"

load_env() {
  local key="$1" default="${2:-}"
  local val=""
  if [[ -f "$ENV_FILE" ]]; then
    val=$(grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed 's/^["'\'']//;s/["'\'']$//' || true)
  fi
  printf '%s' "${val:-$default}"
}

HEALTH_URL=$(load_env GATEWAY_HEALTH_URL "https://123resume.de/api/health/")
ALERT_TO=$(load_env ERROR_ALERT_EMAIL "contact@123resume.de")
API_KEY=$(load_env MAILGUN_API_KEY "")
DOMAIN=$(load_env MAILGUN_DOMAIN "")
BASE_URL=$(load_env MAILGUN_BASE_URL "https://api.eu.mailgun.net")
COOLDOWN=$(load_env GATEWAY_ALERT_COOLDOWN_SECONDS "600")

BODY_FILE=$(mktemp)
trap 'rm -f "$BODY_FILE"' EXIT

CURL_EXIT=0
HTTP_CODE=$(curl -sS -o "$BODY_FILE" -w "%{http_code}" \
  --connect-timeout 10 --max-time 20 \
  -H "Accept: application/json" \
  "$HEALTH_URL" 2>/dev/null) || CURL_EXIT=$?

SNIPPET=$(head -c 400 "$BODY_FILE" | tr '\n' ' ')
CONTENT_TYPE_HINT="unknown"
if grep -qi "<html" "$BODY_FILE" 2>/dev/null; then
  CONTENT_TYPE_HINT="html"
elif grep -q '"status"' "$BODY_FILE" 2>/dev/null; then
  CONTENT_TYPE_HINT="json"
fi

NGINX_ERRORS=$(docker logs gateway_nginx --since 3m 2>&1 \
  | grep -E "connect\(\) failed|upstream timed out|no live upstreams|refused while connecting to upstream" \
  | tail -5 || true)
NGINX_ERROR_COUNT=0
if [[ -n "$NGINX_ERRORS" ]]; then
  NGINX_ERROR_COUNT=$(printf '%s\n' "$NGINX_ERRORS" | grep -c . || true)
fi

FAILED=0
REASON=""
if [[ "$FORCE_ALERT" -eq 1 ]]; then
  FAILED=1
  REASON="forced probe (--force-alert)"
elif [[ "$CURL_EXIT" -ne 0 ]]; then
  FAILED=1
  REASON="curl failed (exit=$CURL_EXIT, code=${HTTP_CODE:-000})"
elif [[ "$HTTP_CODE" != "200" ]]; then
  FAILED=1
  REASON="HTTP $HTTP_CODE through gateway (often nginx 502 HTML when upstream is unreachable)"
elif [[ "$CONTENT_TYPE_HINT" == "html" ]]; then
  FAILED=1
  REASON="HTTP 200 but HTML body (unexpected for /api/health/)"
elif [[ "$NGINX_ERROR_COUNT" -gt 0 ]]; then
  # Health recovered, but nginx saw upstream failures in the last 3 minutes
  FAILED=1
  REASON="gateway_nginx upstream errors in last 3m (count=$NGINX_ERROR_COUNT)"
fi

if [[ "$FAILED" -eq 0 ]]; then
  exit 0
fi

NOW=$(date +%s)
if [[ "$FORCE_ALERT" -eq 0 && -f "$COOLDOWN_FILE" ]]; then
  LAST=$(cat "$COOLDOWN_FILE" 2>/dev/null || echo 0)
  if [[ "$LAST" =~ ^[0-9]+$ ]] && (( NOW - LAST < COOLDOWN )); then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) skip alert (cooldown): $REASON"
    exit 0
  fi
fi

if [[ -z "$API_KEY" || -z "$DOMAIN" || -z "$ALERT_TO" ]]; then
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) cannot alert: missing MAILGUN_* or ERROR_ALERT_EMAIL" >&2
  exit 1
fi

SUBJECT="[123Resume GATEWAY] ${REASON}"
TEXT=$(cat <<EOF
123Resume gateway / nginx health alert

When (UTC): $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Reason:     $REASON
URL:        $HEALTH_URL
HTTP code:  ${HTTP_CODE:-000}
curl exit:  $CURL_EXIT
Body hint:  $CONTENT_TYPE_HINT
Snippet:    $SNIPPET

Recent gateway_nginx upstream errors (last 3m):
${NGINX_ERRORS:-"(none)"}

This check runs on the host through public HTTPS so it catches nginx 502s
that never reach Django (and thus never hit ErrorAlertMiddleware).
EOF
)

RESP=$(curl -sS --max-time 15 \
  -u "api:${API_KEY}" \
  "${BASE_URL}/v3/${DOMAIN}/messages" \
  -F from="123Resume Alerts <noreply@${DOMAIN}>" \
  -F to="$ALERT_TO" \
  -F subject="$SUBJECT" \
  -F text="$TEXT" \
  -F "o:tag=gateway-health-alert" || true)

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) alert sent to $ALERT_TO :: $REASON :: mailgun=$RESP"
echo "$NOW" > "$COOLDOWN_FILE"
