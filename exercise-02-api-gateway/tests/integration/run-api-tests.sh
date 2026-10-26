#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8081}"
EMAIL="${DEMO_USER_EMAIL:-student@example.test}"
PASSWORD="${DEMO_USER_PASSWORD:?Set DEMO_USER_PASSWORD or source .env}"

login_response="$(curl --fail-with-body --silent --show-error \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')" \
  "$BASE_URL/auth/login")"
token="$(jq -er '.accessToken' <<<"$login_response")"

echo 'GW-AUTH-01 valid token'
curl --fail-with-body --silent --show-error -H "Authorization: Bearer $token" "$BASE_URL/users/me" | jq .

echo 'GW-ROUTE-02 orders route'
curl --fail-with-body --silent --show-error -H "Authorization: Bearer $token" "$BASE_URL/orders" | jq .

echo 'GW-AGG-01 dashboard aggregation'
curl --fail-with-body --silent --show-error -H "Authorization: Bearer $token" "$BASE_URL/dashboard" | jq .

echo 'GW-AUTH-02 invalid token must be 401'
invalid_status="$(curl --silent --output /dev/null --write-out '%{http_code}' -H 'Authorization: Bearer invalid' "$BASE_URL/users/me")"
test "$invalid_status" = '401'

echo 'GW-AUTH-04 spoofed identity must be overwritten'
spoofed_id="$(curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer $token" -H 'X-User-Id: attacker' "$BASE_URL/users/me" | jq -r '.user.id')"
test "$spoofed_id" = 'usr-001'

echo 'Core API integration tests passed.'

