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

url="$(jq -er '.url' <<<"$policy")"
object_key="$(jq -er '.objectKey' <<<"$policy")"
curl_args=(--fail-with-body --silent --show-error)
while IFS= read -r entry; do
  key="$(base64 -d <<<"$entry" | jq -r '.key')"
  value="$(base64 -d <<<"$entry" | jq -r '.value')"
  curl_args+=(-F "$key=$value")
done < <(jq -r '.fields | to_entries[] | @base64' <<<"$policy")
curl_args+=(-F "file=@$IMAGE_FILE;type=image/png")
curl "${curl_args[@]}" "$url"

curl --fail-with-body --silent --show-error -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg objectKey "$object_key" '{objectKey:$objectKey}')" \
  "$BASE_URL/users/me/avatar-confirm" | jq -e '.verified == true'

echo 'GW-VALET-01 passed.'

