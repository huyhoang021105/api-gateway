# Verified Test Results — 2026-10-26

## Environment

- Docker Engine 29.1.3; Docker Compose 2.40.3.
- Host OS: Linux; tests executed against localhost.
- WAF: OWASP CRS 4.25.1, ModSecurity 3.0.16, Nginx connector 1.0.4.
- Juice Shop: 17.1.1.
- Gateway: Nginx 1.28.0; `nginx -V` confirmed `--with-http_auth_request_module`.
- Node application container: Node 24.10.0.
- MinIO lab archive: `bitnamilegacy/minio:2025.7.23-debian-12-r5`.
- k6: 0.57.0.

Raw generated results are intentionally ignored because they can contain active JWT/presigned fields. Commands and redacted evidence are documented below.

## Exercise 01 — WAF

Command: `bash tests/scripts/run-waf-tests.sh`, followed by filtered `docker compose logs waf`.

| Test | Expected from PDF | Actual | Result |
|---|---|---|---|
| WAF-ENV-01 | Ports 3000 and 8080 available | Both containers healthy; both ports served Juice Shop | PASS |
| WAF-SQLI-01 | Direct SQLi bypasses login | HTTP 200; authenticated as `admin@juice-sh.op` | PASS |
| WAF-SQLI-02 | Same request via WAF is blocked | HTTP 403 | PASS |
| WAF-VALID-01 | Valid admin login is not blocked | HTTP 200 through port 8080 | PASS |
| WAF-LOG-01 | Rule 942100 identifies SQLi | Rule `942100`, “SQL Injection Attack Detected via libinjection”; anomaly score 5 then rule `949110` blocked | PASS |

Matched data was the JSON email value `' OR 1=1--`. No discrepancy from the PDF was observed with the pinned versions. Authentication tokens were redacted and are not committed.

## Exercise 02 — Functional and security tests

| Test | Actual | Result |
|---|---|---|
| GW-ROUTE-01/02 | `/users/me` and `/orders` returned the correct fixture service data through port 8081 | PASS |
| GW-AUTH-01 | Valid signed JWT accepted | PASS |
| GW-AUTH-02/03 | Malformed, wrong-signature, missing and expired JWT all returned 401 | PASS |
| GW-AUTH-04 | Client `X-User-Id: attacker` was overwritten; service observed `usr-001` | PASS |
| GW-RATE-01 | k6 at 8 r/s completed with 0% HTTP errors | PASS |
| GW-RATE-02 | 40-request burst returned 11 application responses and 29 HTTP 429 responses | PASS |
| GW-AGG-01 | Dashboard returned user + orders with `partial:false` | PASS |
| GW-AGG-02 | Unit integration tests verified 206 partial behavior when one dependency returned 503 | PASS |
| GW-VALET-01 | PNG uploaded directly to MinIO and confirm returned `verified:true` | PASS |
| GW-VALET-02 | Policy reported TTL 300 seconds; upload after expiry returned 403 | PASS |
| GW-VALET-03 | Invalid MIME 400, oversized upload 400, foreign object key 403 | PASS |

Rate-limit burst requests intentionally used an invalid login body. HTTP 404 indicates the request reached the application; HTTP 429 indicates rejection at Nginx.

## Performance benchmark

Method:

- Separate 10-second warm-up for each path.
- Three 30-second measurement runs per path.
- Constant arrival rate 8 requests/second.
- Same response workload for direct and gateway variants.
- Direct calls use the lab-only trusted identity header; Gateway calls use a valid JWT and therefore include proxy plus JWT verification overhead.

The table reports the arithmetic mean of each k6 summary metric across three runs.

| Scenario | Requests | Avg latency | p50 | p95 | Throughput | Error rate |
|---|---:|---:|---:|---:|---:|---:|
| User direct | 721 | 1.021 ms | 0.960 ms | 1.489 ms | 8.011 req/s | 0% |
| User via Gateway | 723 | 2.952 ms | 2.822 ms | 4.434 ms | 8.032 req/s | 0% |
| Order direct | 723 | 0.989 ms | 0.946 ms | 1.397 ms | 8.033 req/s | 0% |
| Order via Gateway | 723 | 2.947 ms | 2.826 ms | 4.223 ms | 8.032 req/s | 0% |

On this local run, Gateway added roughly 1.9–2.0 ms average latency. These values are environment-specific and must not be presented as production capacity.

## Code quality checks

- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- `npm test`: 2 files, 4 tests, all PASS.
- `npm audit`: 0 known vulnerabilities at test time.
- Both Compose files pass `docker compose config --quiet`.
- Shell scripts pass `bash -n`; Postman collection passes `jq empty`.

