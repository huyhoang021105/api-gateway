# Exercise 02 Evidence

Raw output belongs in ignored `generated/`. A reviewed report should include:

- Compose image tags/digests and host specification;
- Newman/integration summaries;
- JWT negative-case status without storing tokens;
- rate-limit status distribution and configured burst behavior;
- MinIO upload/confirm response with signed fields redacted;
- k6 JSON summaries for three direct and three gateway runs per service;
- average, median/p50, p95, request rate/throughput and error rate.

