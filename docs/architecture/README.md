# Architecture

## Exercise 01 — WAF / Gatekeeper

```mermaid
flowchart LR
    C[Client]
    C -->|localhost:3000 - direct| J[OWASP Juice Shop]
    C -->|localhost:8080| W[Nginx + ModSecurity + OWASP CRS]
    W -->|allowed request| J
    W -->|malicious request| F[403 Forbidden]
    W --> L[Audit log]
```

Port 3000 tồn tại để chứng minh khác biệt khi bỏ qua Gatekeeper. Port 8080 là đường được bảo vệ.

## Exercise 02 — API Gateway patterns

```mermaid
flowchart LR
    C[Client] --> G[Nginx OSS API Gateway :8081]
    G -. auth_request .-> U[User Service]
    G -->|/auth, /users| U
    G -->|/orders| O[Order Service]
    G -->|/dashboard| B[Dashboard BFF]
    B -->|parallel| U
    B -->|parallel| O
    C -->|request upload policy| G
    U -->|presign| M[(MinIO private bucket)]
    U -->|URL + form fields| C
    C -->|direct upload| M
    U -->|HEAD on confirm| M
```

Nginx OSS không có `auth_jwt` như một khả năng mặc định. Gateway dùng `auth_request` tới endpoint nội bộ của User Service. Dashboard BFF chỉ làm composition và error mapping, không chứa nghiệp vụ User/Order.

