#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8081}"
EMAIL="${DEMO_USER_EMAIL:-student@example.test}"
PASSWORD="${DEMO_USER_PASSWORD:?Set DEMO_USER_PASSWORD or source .env}"
OVERSIZED_FILE="$(mktemp)"
trap 'rm -f "$OVERSIZED_FILE"' EXIT

token="$(curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')" \
  "$BASE_URL/auth/login" | jq -er '.accessToken')"

invalid_type_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"contentType":"text/plain"}' "$BASE_URL/users/me/avatar-upload-request")"
test "$invalid_type_status" = '400'
echo "GW-VALET-03 invalid MIME status=$invalid_type_status"

policy="$(curl --fail-with-body --silent --show-error -H "Authorization: Bearer $token" \
  -H 'Content-Type: application/json' -d '{"contentType":"image/png"}' \
  "$BASE_URL/users/me/avatar-upload-request")"
url="$(jq -er '.url' <<<"$policy")"
dd if=/dev/zero of="$OVERSIZED_FILE" bs=1048576 count=2 status=none
printf x >> "$OVERSIZED_FILE"

curl_args=(--silent --output /dev/null --write-out '%{http_code}')
while IFS= read -r entry; do
  key="$(base64 -d <<<"$entry" | jq -r '.key')"
  value="$(base64 -d <<<"$entry" | jq -r '.value')"
  curl_args+=(-F "$key=$value")
done < <(jq -r '.fields | to_entries[] | @base64' <<<"$policy")
curl_args+=(-F "file=@$OVERSIZED_FILE;type=image/png")
oversized_status="$(curl "${curl_args[@]}" "$url")"
test "$oversized_status" != '204'
echo "GW-VALET-03 oversized upload rejected status=$oversized_status"

wrong_owner_status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  -H "Authorization: Bearer $token" -H 'Content-Type: application/json' \
  -d '{"objectKey":"avatars/another-user/file.png"}' "$BASE_URL/users/me/avatar-confirm")"
test "$wrong_owner_status" = '403'
echo "GW-VALET-03 wrong owner status=$wrong_owner_status"

