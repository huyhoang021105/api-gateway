# Demo Checklist

1. Hiển thị `docker compose ps` của Exercise 01.
2. Gửi cùng payload SQL injection tới port 3000 và 8080.
3. Hiển thị response thực tế và rule CRS trong WAF log.
4. Gửi login hợp lệ qua WAF để kiểm tra false positive.
5. Khởi chạy Exercise 02 và đăng nhập qua Gateway.
6. Demo `/users/me`, `/orders`, `/dashboard` chỉ qua port 8081.
7. Demo token sai/hết hạn bị từ chối.
8. Demo rate limit và các response `429`.
9. Xin Presigned POST, upload trực tiếp lên MinIO rồi confirm.
10. Hiển thị báo cáo k6 direct so với gateway.

Trước khi quay/chụp bằng chứng, xóa hoặc che JWT, cookie, password và presigned form fields.

