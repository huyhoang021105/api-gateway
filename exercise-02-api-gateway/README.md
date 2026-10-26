# Exercise 02 — Microservices API Gateway

Project minh họa bốn pattern trong PDF:

- **Gateway Routing:** `/users` và `/orders` được Nginx chuyển tới đúng service.
- **Gateway Offloading:** Nginx gọi `auth_request` để xác minh JWT và áp dụng rate limit 10 request/giây.
- **Gateway Aggregation:** `/dashboard` gọi User/Order song song trong một BFF nhỏ.
- **Valet Key:** User Service cấp MinIO Presigned POST hết hạn sau 5 phút.

> Lưu ý phiên bản: MinIO đã ngừng phân phối public community image trong năm 2026. Compose pin bản archive `bitnamilegacy/minio:2025.7.23-debian-12-r5` cho lab cục bộ. Không dùng image legacy này làm khuyến nghị production.

## Chuẩn bị

```bash
cp .env.example .env
openssl rand -base64 48              # dùng kết quả làm JWT_SECRET
# Thay toàn bộ CHANGE_ME trong .env
```

Không commit `.env`. User fixture lấy email/password từ environment; password không được trả qua API.

## Chạy

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:8081/health
```

Public entry point là `http://localhost:8081`. Port `3001/3002` chỉ được expose để thực hiện benchmark trực tiếp trong lab; đây không phải cấu hình production.

## API và authentication

| Method/path | Access | Chức năng |
|---|---|---|
| `GET /health` | Public | Gateway health |
| `POST /auth/login` | Public, rate-limited | Phát hành JWT |
| `GET /users/me` | JWT | User hiện tại |
| `GET /orders` | JWT | Orders của `sub` |
| `GET /dashboard` | JWT | User + orders |
| `POST /users/me/avatar-upload-request` | JWT | Presigned POST policy |
| `POST /users/me/avatar-confirm` | JWT | HEAD và xác minh object |

JWT được kiểm tra chữ ký HS256, allowlist thuật toán, `iss`, `aud`, `sub`, `iat`, `exp`, `jti`. Nginx OSS không được giả định có `auth_jwt`; location nội bộ `/_auth` dùng `auth_request` tới User Service. Header identity do client gửi bị xóa và được thiết lập lại từ kết quả xác thực.

## Functional tests

```bash
set -a
. ./.env
set +a
bash tests/integration/run-api-tests.sh
bash tests/integration/test-rate-limit.sh
bash tests/integration/test-avatar-upload.sh
bash tests/integration/test-avatar-negative.sh
# Test này chờ đủ 5 phút để chứng minh policy hết hạn tại storage:
bash tests/integration/test-avatar-expiry.sh
```

Unit/type/dependency checks:

```bash
npm ci
npm run typecheck
npm test
npm audit
```

Postman collection nằm tại `tests/postman/api-gateway.postman_collection.json`; login test tự lưu token vào collection variable. Có thể chạy Newman bằng container thay vì cài lên host.

```bash
docker run --rm --network host \
  -v "$PWD/tests/postman:/etc/newman:ro" \
  postman/newman:6.2.1 run /etc/newman/api-gateway.postman_collection.json \
  --env-var baseUrl=http://localhost:8081 \
  --env-var email="$DEMO_USER_EMAIL" \
  --env-var password="$DEMO_USER_PASSWORD"
```

## Rate limit behavior

Nginx dùng key `$binary_remote_addr`, `rate=10r/s`, `burst=10`, `nodelay` và status `429`. Burst được chấp nhận ngay đến khi bucket hết chỗ; capacity sau đó được bổ sung với tốc độ 10 request/giây. Đây không phải cam kết cho phép 20 request/giây liên tục.

## Avatar upload security

- Bucket private; TTL 300 giây.
- Key do backend tạo: `avatars/{sub}/{uuid}.{png|jpg}`.
- Chỉ `image/png` và `image/jpeg`, tối đa 2 MiB.
- POST policy ràng buộc key, MIME và `content-length-range`.
- Confirm endpoint kiểm tra ownership prefix và HEAD metadata.

Trong lab, User Service dùng MinIO root credential để tự tạo bucket và ký policy nhằm giữ Compose tự khởi tạo bằng một lệnh. Credential này không được trả cho client; quyền thực tế của client vẫn bị giới hạn bởi POST policy. Tách bootstrap credential khỏi một service account chỉ có quyền trên prefix `avatars/` là hardening **OPTIONAL** được khuyến nghị nếu chuyển ra ngoài lab.

MIME/header không chứng minh nội dung file thực. Magic-byte validation, antivirus và cleanup object chưa confirm là các cải tiến **OPTIONAL**.

## Performance benchmark

Benchmark dùng cùng endpoint/payload, fixed rate 8 r/s để không vô tình benchmark response `429`. Warm-up chạy riêng 10 giây; measurement 30 giây và lặp ba lần.

```bash
# Lấy token nhưng không ghi token vào evidence.
TOKEN=$(curl -fsS -H 'Content-Type: application/json' \
  -d "$(jq -nc --arg email "$DEMO_USER_EMAIL" --arg password "$DEMO_USER_PASSWORD" '{email:$email,password:$password}')" \
  http://localhost:8081/auth/login | jq -r .accessToken)

mkdir -p evidence/generated

# Warm-up ví dụ cho User qua Gateway
docker run --rm --network host -e TARGET=http://localhost:8081/users/me \
  -e TOKEN="$TOKEN" -e RATE=8 -e DURATION=10s \
  -v "$PWD/tests/performance:/scripts:ro" grafana/k6:0.57.0 \
  run /scripts/service-comparison.js

# Measurement; lặp run-1..run-3.
docker run --rm --network host -e TARGET=http://localhost:8081/users/me \
  -e TOKEN="$TOKEN" -e RATE=8 -e DURATION=30s \
  -v "$PWD:/work" grafana/k6:0.57.0 run \
  --summary-export=/work/evidence/generated/user-gateway-run-1.json \
  /work/tests/performance/service-comparison.js

# Direct baseline tương ứng: TARGET=http://localhost:3001/users/me,
# bỏ TOKEN và truyền USER_ID=usr-001. Thực hiện tương tự cho /orders ở 3002/8081.
```

Gateway measurement bao gồm chi phí xác thực và rate limiting; báo cáo phải nêu rõ điều này. Các số liệu bắt buộc lấy từ run thực tế, không điền số giả.

Toàn bộ ma trận benchmark có thể chạy bằng:

```bash
set -a; . ./.env; set +a
bash tests/performance/run-benchmarks.sh
```

## Dashboard degradation

- Cả hai dependency thành công: `200`, `partial:false`.
- Một dependency lỗi/timeout: `206`, `partial:true`.
- Cả hai lỗi: `502`; cả hai timeout: `504`.

## Dừng

```bash
docker compose down
# Chỉ dùng `docker compose down -v` khi chủ động muốn xóa object MinIO của lab.
```

