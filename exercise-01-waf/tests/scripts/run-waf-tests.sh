#!/usr/bin/env bash
set -euo pipefail

JUICE_SHOP_PORT="${JUICE_SHOP_PORT:-3000}"
WAF_PORT="${WAF_PORT:-8080}"
DIRECT_BASE="${DIRECT_BASE:-http://localhost:${JUICE_SHOP_PORT}}"
WAF_BASE="${WAF_BASE:-http://localhost:${WAF_PORT}}"
EVIDENCE_DIR="${EVIDENCE_DIR:-}"
SQLI_BODY='{"email":"\u0027 OR 1=1--","password":"anything"}'
VALID_BODY='{"email":"admin@juice-sh.op","password":"admin123"}'

run_case() {
  local test_id="$1"
  local url="$2"
  local body="$3"
  local output
  output="$(mktemp)"
  local status
  status="$(curl --silent --show-error --output "$output" --write-out '%{http_code}' \
    --header 'Content-Type: application/json' \
    --request POST \
    --data "$body" \
    "$url/rest/user/login")"

  echo "$test_id status=$status url=$url/rest/user/login"
  local sanitized
  sanitized="$(mktemp)"
  jq 'if .authentication.token then .authentication.token = "[REDACTED]" else . end' "$output" > "$sanitized" 2>/dev/null \
    || sed -n '1,20p' "$output" > "$sanitized"
  sed -n '1,80p' "$sanitized"

  if [[ -n "$EVIDENCE_DIR" ]]; then
    mkdir -p "$EVIDENCE_DIR"
    printf 'status=%s\nurl=%s\n' "$status" "$url/rest/user/login" > "$EVIDENCE_DIR/$test_id.txt"
    sed -n '1,80p' "$sanitized" >> "$EVIDENCE_DIR/$test_id.txt"
  fi
  rm -f "$output" "$sanitized"
}

run_case WAF-SQLI-01 "$DIRECT_BASE" "$SQLI_BODY"
run_case WAF-SQLI-02 "$WAF_BASE" "$SQLI_BODY"
run_case WAF-VALID-01 "$WAF_BASE" "$VALID_BODY"

echo 'WAF-LOG-01: inspect with docker compose logs waf and correlate the timestamp/rule ID.'

