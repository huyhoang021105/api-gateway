# Exercise 01 — Web Application Firewall

Lab cục bộ minh họa Gatekeeper bằng Nginx + ModSecurity + OWASP CRS trước OWASP Juice Shop.

## Chạy

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

- `http://localhost:3000`: đi thẳng tới Juice Shop, bỏ qua WAF.
- `http://localhost:8080`: đi qua WAF.

### Đổi host port

Sửa hai biến trong `.env`, ví dụ:

```dotenv
JUICE_SHOP_PORT=3100
WAF_PORT=8180
```

Sau đó recreate container và nạp cùng biến cho test script:

```bash
docker compose up -d --force-recreate
set -a
. ./.env
set +a
bash tests/scripts/run-waf-tests.sh
```

Container vẫn nghe ở cổng nội bộ 3000/8080; chỉ host port thay đổi.

## Kiểm thử tái lập

```bash
bash tests/scripts/run-waf-tests.sh
docker compose logs waf | grep -E '942100|SQL Injection|id.*942'
```

Script gửi JSON tới API login hiện hành của Juice Shop. Kết quả trong slide (`direct` bypass, WAF `403`, rule `942100`) là kỳ vọng, không phải dữ liệu được hard-code. Script luôn in status/body thực tế.

Credential được slide cung cấp là `admin@juice-sh.op / admin123`. Phiên bản Juice Shop được pin vẫn có thể thay đổi seed/behavior; nếu đăng nhập không thành công nhưng request không bị WAF chặn, cần ghi riêng application result và WAF false-positive result.

## Thu thập bằng chứng

```bash
mkdir -p evidence/generated
EVIDENCE_DIR=evidence/generated bash tests/scripts/run-waf-tests.sh
docker compose logs --no-color waf > evidence/generated/waf.log
```

`evidence/generated/` bị Git ignore vì log có thể chứa session/token. Chỉ đưa bản đã redaction vào báo cáo.

## Dừng

```bash
docker compose down
```

