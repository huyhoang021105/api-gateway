# Software Architecture – Security Design Patterns

Monorepo gồm hai bài thực hành độc lập:

- [`exercise-01-waf`](exercise-01-waf/README.md): Gatekeeper với Nginx, ModSecurity, OWASP CRS và OWASP Juice Shop.
- [`exercise-02-api-gateway`](exercise-02-api-gateway/README.md): Gateway Routing, Offloading, Aggregation và Valet Key.

## Yêu cầu môi trường

- Docker Engine 24+
- Docker Compose v2
- `curl` và `jq` cho các script kiểm thử shell

Không cần cài Node.js, Newman hoặc k6 trên máy host; các công cụ kiểm thử có thể chạy bằng container.

## Port map

| Project | Component | Host port |
|---|---|---:|
| Exercise 01 | Juice Shop trực tiếp | 3000 |
| Exercise 01 | Juice Shop qua WAF | 8080 |
| Exercise 02 | API Gateway | 8081 |
| Exercise 02 | User Service direct, chỉ dành cho lab/benchmark | 3001 |
| Exercise 02 | Order Service direct, chỉ dành cho lab/benchmark | 3002 |
| Exercise 02 | MinIO API / Console | 9000 / 9001 |

Hai project dùng network, volume và Compose project name riêng, vì vậy có thể chạy đồng thời.

## Chạy nhanh

```bash
cd exercise-01-waf
docker compose up -d

cd ../exercise-02-api-gateway
cp .env.example .env
# Thay các giá trị CHANGE_ME trước khi chạy.
docker compose up -d --build
```

Xem README của từng project để chạy test, thu thập bằng chứng và dừng môi trường.

## Quy tắc bảo mật repository

- Không commit `.env`, JWT, cookie, presigned URL còn hiệu lực hoặc MinIO credentials.
- Các file trong `evidence/` chỉ là template/report đã loại secret; output thô sinh vào `evidence/generated/` và bị ignore.
- Image/dependency được khóa bằng tag cụ thể và `package-lock.json`; không sử dụng tag `latest`.

## Tài liệu

- [Kiến trúc](docs/architecture/README.md)
- [Requirement traceability](docs/reports/requirement-traceability.md)
- [Demo checklist](docs/demo-checklist.md)

