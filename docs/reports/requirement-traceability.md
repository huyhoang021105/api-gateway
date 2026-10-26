# Requirement Traceability

Kết quả được kiểm chứng ngày 2026-10-26 trên local Docker lab. Chi tiết và số liệu nằm trong [`verified-results-2026-10-26.md`](verified-results-2026-10-26.md).

| Requirement | Implementation | Test | Status |
|---|---|---|---|
| REQ-WAF-01 | `exercise-01-waf/docker-compose.yml` | WAF-ENV-01 | COMPLETED AND VERIFIED |
| REQ-WAF-02 | Direct Juice Shop test | WAF-SQLI-01 | COMPLETED AND VERIFIED |
| REQ-WAF-03 | ModSecurity/CRS test | WAF-SQLI-02 | COMPLETED AND VERIFIED |
| REQ-WAF-04 | Valid login test | WAF-VALID-01 | COMPLETED AND VERIFIED |
| REQ-WAF-05 | WAF audit log collection | WAF-LOG-01 | COMPLETED AND VERIFIED |
| REQ-GW-01 | Nginx prefix routing | GW-ROUTE-01/02 | COMPLETED AND VERIFIED |
| REQ-GW-02 | JWT + `auth_request` | GW-AUTH-01..04 | COMPLETED AND VERIFIED |
| REQ-GW-03 | Nginx `limit_req` | GW-RATE-01/02 | COMPLETED AND VERIFIED |
| REQ-GW-04 | Dashboard BFF | GW-AGG-01/02 | COMPLETED AND VERIFIED |
| REQ-GW-05 | MinIO Presigned POST | GW-VALET-01..03 | COMPLETED AND VERIFIED |
| REQ-GW-06 | k6 benchmark | GW-PERF-01 | COMPLETED AND VERIFIED |


