#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8081}"
OUTPUT="$(mktemp)"
trap 'rm -f "$OUTPUT"' EXIT

for _ in $(seq 1 40); do
  curl --silent --output /dev/null --write-out '%{http_code}\n' "$BASE_URL/auth/login" >> "$OUTPUT" &
done
wait

sort "$OUTPUT" | uniq -c
grep -q '^429$' "$OUTPUT" || {
  echo 'Expected at least one HTTP 429 response' >&2
  exit 1
}
echo 'GW-RATE-02 passed: burst above configured capacity produced HTTP 429.'

# Let the 10 r/s bucket drain before a sequential test suite performs login.
# Without this pause, the next test can legitimately receive 429 and `set -e`
# makes the surrounding suite appear to have crashed.
sleep 2
echo 'Rate-limit bucket recovery window completed.'

