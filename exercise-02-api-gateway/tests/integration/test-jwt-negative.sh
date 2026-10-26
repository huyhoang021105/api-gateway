#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8081}"
: "${JWT_SECRET:?Set JWT_SECRET or source .env}"
JWT_ISSUER="${JWT_ISSUER:-security-patterns-lab}"
JWT_AUDIENCE="${JWT_AUDIENCE:-api-gateway}"

make_token() {
  local secret="$1"
  local expiration="$2"
  JWT_SIGNING_SECRET="$secret" JWT_EXPIRATION="$expiration" node --input-type=module <<'NODE'
import { SignJWT } from 'jose';
const now = Math.floor(Date.now() / 1000);
const token = await new SignJWT({ role: 'user' })
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setSubject('usr-001')
  .setIssuer(process.env.JWT_ISSUER || 'security-patterns-lab')
  .setAudience(process.env.JWT_AUDIENCE || 'api-gateway')
  .setJti('negative-test')
  .setIssuedAt(now - 120)
  .setExpirationTime(Number(process.env.JWT_EXPIRATION))
  .sign(new TextEncoder().encode(process.env.JWT_SIGNING_SECRET));
process.stdout.write(token);
NODE
}

now="$(date +%s)"
expired_token="$(JWT_ISSUER="$JWT_ISSUER" JWT_AUDIENCE="$JWT_AUDIENCE" make_token "$JWT_SECRET" "$((now - 60))")"
wrong_token="$(JWT_ISSUER="$JWT_ISSUER" JWT_AUDIENCE="$JWT_AUDIENCE" make_token 'wrong-secret-with-at-least-32-characters' "$((now + 300))")"

for case_name in missing expired wrong_signature; do
  case "$case_name" in
    missing) auth_args=() ;;
    expired) auth_args=(-H "Authorization: Bearer $expired_token") ;;
    wrong_signature) auth_args=(-H "Authorization: Bearer $wrong_token") ;;
  esac
  status="$(curl --silent --output /dev/null --write-out '%{http_code}' "${auth_args[@]}" "$BASE_URL/users/me")"
  echo "GW-AUTH negative case=$case_name status=$status"
  test "$status" = '401'
done

