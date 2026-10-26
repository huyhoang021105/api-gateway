#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8081}"
EMAIL="${DEMO_USER_EMAIL:-student@example.test}"
PASSWORD="${DEMO_USER_PASSWORD:?Set DEMO_USER_PASSWORD or source .env}"
IMAGE_FILE="$(mktemp --suffix=.png)"
trap 'rm -f "$IMAGE_FILE"' EXIT
base64 -d > "$IMAGE_FILE" <<'PNG'
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=
PNG

token="$(curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')" \
  "$BASE_URL/auth/login" | jq -er '.accessToken')"
policy="$(curl --fail-with-body --silent --show-error -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"contentType":"image/png"}' \
  "$BASE_URL/users/me/avatar-upload-request")"

expires_epoch="$(date -d "$(jq -r '.expiresAt' <<<"$policy")" +%s)"
now_epoch="$(date +%s)"
remaining="$((expires_epoch - now_epoch))"
if (( remaining < 295 || remaining > 300 )); then
  echo "Unexpected upload TTL: ${remaining}s" >&2
  exit 1
fi
echo "GW-VALET-02 policy TTL verified: ${remaining}s; waiting until expiry..."
while (( $(date +%s) <= expires_epoch )); do
  sleep 30
done

url="$(jq -er '.url' <<<"$policy")"
curl_args=(--silent --output /dev/null --write-out '%{http_code}')
while IFS= read -r entry; do
  key="$(base64 -d <<<"$entry" | jq -r '.key')"
  value="$(base64 -d <<<"$entry" | jq -r '.value')"
  curl_args+=(-F "$key=$value")
done < <(jq -r '.fields | to_entries[] | @base64' <<<"$policy")
curl_args+=(-F "file=@$IMAGE_FILE;type=image/png")
status="$(curl "${curl_args[@]}" "$url")"
test "$status" != '204'
echo "GW-VALET-02 expired upload rejected status=$status"

