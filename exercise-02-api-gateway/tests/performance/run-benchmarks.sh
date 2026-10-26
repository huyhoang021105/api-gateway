#!/usr/bin/env bash
set -euo pipefail

: "${DEMO_USER_PASSWORD:?Set DEMO_USER_PASSWORD or source .env}"
DEMO_USER_EMAIL="${DEMO_USER_EMAIL:-student@example.test}"
K6_IMAGE="${K6_IMAGE:-grafana/k6:0.57.0}"
RESULT_DIR="${RESULT_DIR:-$PWD/evidence/generated}"
mkdir -p "$RESULT_DIR"

token="$(curl --fail-with-body --silent --show-error -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg email "$DEMO_USER_EMAIL" --arg password "$DEMO_USER_PASSWORD" '{email:$email,password:$password}')" \
  http://localhost:8081/auth/login | jq -er '.accessToken')"

run_k6() {
  local name="$1"
  local target="$2"
  local auth_mode="$3"
  local duration="$4"
  local summary_file="${5:-}"
  local env_args=(-e "TARGET=$target" -e RATE=8 -e "DURATION=$duration")
  if [[ "$auth_mode" = gateway ]]; then
    env_args+=(-e "TOKEN=$token")
  else
    env_args+=(-e USER_ID=usr-001)
  fi
  local summary_args=()
  if [[ -n "$summary_file" ]]; then
    summary_args=(--summary-export="/work/evidence/generated/$summary_file")
  fi
  echo "Running $name duration=$duration"
  docker run --rm --network host --user "$(id -u):$(id -g)" \
    "${env_args[@]}" -v "$PWD:/work" "$K6_IMAGE" run --quiet \
    "${summary_args[@]}" /work/tests/performance/service-comparison.js
}

scenarios=(
  'user-direct|http://localhost:3001/users/me|direct'
  'user-gateway|http://localhost:8081/users/me|gateway'
  'order-direct|http://localhost:3002/orders|direct'
  'order-gateway|http://localhost:8081/orders|gateway'
)

for scenario in "${scenarios[@]}"; do
  IFS='|' read -r name target auth_mode <<<"$scenario"
  run_k6 "$name-warmup" "$target" "$auth_mode" 10s
  for run in 1 2 3; do
    run_k6 "$name-run-$run" "$target" "$auth_mode" 30s "$name-run-$run.json"
  done
done

echo "Benchmark summaries written to $RESULT_DIR"

