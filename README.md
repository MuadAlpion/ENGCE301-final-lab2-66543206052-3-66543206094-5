## 📋 ภาพรวมโปรเจค

- **สถาปัตยกรรม**: Microservices แบบแยกส่วนชัดเจน
- **ฐานข้อมูล**: PostgreSQL (shared database)
- **Frontend**: Static HTML/JS (Single Page Application)
- **API Gateway**: Nginx พร้อม TLS termination และ Security Headers
- **Authentication**: JWT (JSON Web Token) พร้อม expiration
- **Authorization**: Role-based (member/admin)
- **Logging**: Centralized logging ด้วย log-service
- **Container**: Docker + Docker Compose

## 🏗️ ผังสถาปัตยกรรมระบบ

```mermaid
graph TB
    subgraph "🌐 External"
        Client[Client Browser] -->|HTTPS 443| Nginx
        Client -->|HTTP 80| Redirect[HTTP → HTTPS Redirect]
    end

    subgraph "🔒 DMZ / Reverse Proxy"
        Nginx[Nginx API Gateway] -->|Rate Limit| Auth[Auth Service:3001]
        Nginx -->|Rate Limit| Task[Task Service:3002]
        Nginx -->|Rate Limit| Log[Log Service:3003]
        Nginx -->|Static Files| Frontend[Frontend:80]
        
        Nginx -->|Internal Log| Log
    end

    subgraph "🛡️ Internal Services"
        Auth -->|JWT Verify| Task
        Auth -->|JWT Verify| Log
        Task -->|DB Query| PG[(PostgreSQL)]
        Log  -->|DB Query| PG
        Auth -->|DB Query| PG
        Frontend -->|API Calls| Nginx
    end

    subgraph "📊 Monitoring"
        Dashboard[Log Dashboard] -->|Read Logs| Log
        Dashboard -->|JWT Required| Nginx
    end

    classDef secure fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    classDef internal fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef external fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    
    class Client,Redirect external
    class Nginx,Auth,Task,Log,Frontend secure
    class PG,Dashboard internal
```

### ส่วนประกอบหลัก

- **Frontend**: หน้าเว็บแอปพลิเคชัน (index.html, logs.html)
- **Nginx**: API Gateway ทำหน้าที่ TLS termination, rate limiting, reverse proxy
- **Auth Service**: จัดการการลงทะเบียน, เข้าสู่ระบบ, สร้าง JWT
- **Task Service**: จัดการ Task CRUD พร้อมการตรวจสอบสิทธิ์
- **Log Service**: รับและจัดเก็บ log จาก services อื่นๆ
- **PostgreSQL**: ฐานข้อมูลกลางสำหรับ users, tasks, logs

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนดเบื้องต้น

- Docker
- Docker Compose
- Git

### ขั้นตอนการติดตั้ง

1. **ดาวน์โหลดโปรเจค**
   ```bash
   git clone <repository-url>
   cd finallab
   ```

2. **ตั้งค่า Environment Variables**
   ```bash
   cp .env.example .env
   ```
   
   แก้ไขไฟล์ `.env` ตามต้องการ (สามารถใช้ค่า default ได้)

3. **สร้าง SSL Certificate สำหรับ development**
   ```bash
   ./scripts/gen-certs.sh
   ```
   
   คำสั่งนี้จะสร้าง self-signed certificate ใน `nginx/certs/`

4. **รันด้วย Docker Compose**
   ```bash
   docker-compose up -d
   ```

5. **รอสักครู่ให้บริการทั้งหมดขึ้น**
   ```bash
   # ตรวจสอบสถานะ
   docker-compose ps
   
   # ดู log ถ้าต้องการ
   docker-compose logs -f
   ```

6. **เข้าใช้งาน**
   - เปิดเบราว์เซอร์ไปที่: `https://localhost`
   - ระบบจะ redirect อัตโนมัติจาก HTTP ไป HTTPS

### ข้อมูลเข้าสู่ระบบเริ่มต้น

| ผู้ใช้ | อีเมล | รหัสผ่าน | Role |
|--------|--------|----------|------|
| Alice | alice@example.com | password123 | member |
| Admin | admin@example.com | password123 | admin |

## 🔒 HTTPS และ Security Flow

### TLS Termination ที่ Nginx

```
Client HTTPS Request
        ↓
    Nginx (Port 443)
        ↓ (TLS terminated here)
    Internal HTTP to Services
```

- **TLS termination** เกิดที่ Nginx ทำให้ services ภายในสามารถใช้ HTTP ได้
- **Certificate**: Self-signed สำหรับ development (สามารถเปลี่ยนเป็น certificate จริงได้)
- **Protocols**: TLS 1.2 และ 1.3 เท่านั้น

### HTTP → HTTPS Redirect

```nginx
server {
    listen 80;
    server_name localhost;
    return 301 https://$host$request_uri;
}
```

- ทุกการเข้าถึง HTTP (port 80) จะถูก redirect ไป HTTPS (port 443) อัตโนมัติ

### Security Headers

Nginx เพิ่ม security headers สำคัญ:

```nginx
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
```

- **HSTS**: บังคับใช้ HTTPS เป็นเวลา 1 ปี
- **X-Frame-Options**: ป้องกัน clickjacking
- **X-Content-Type-Options**: ป้องกัน MIME type sniffing
- **X-XSS-Protection**: เปิดใช้งาน XSS filter

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/m;
```

- **Login endpoint**: สูงสุด 5 ครั้งต่อนาที (ป้องกัน brute force)
- **API endpoints**: สูงสุด 30 ครั้งต่อนาที (ป้องกัน DDoS)
- **Burst handling**: อนุญาต burst พร้อม nodelay

### JWT Authentication Flow

```
1. Client → Auth Service: Login
   POST /api/auth/login {email, password}
   
2. Auth Service → Client: JWT Token
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   
3. Client → Nginx → Task Service: Request with JWT
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   
4. Task Service: Verify JWT
   - ตรวจสอบ signature กับ JWT_SECRET
   - ตรวจสอบ expiration time
   - ดึง user info จาก payload
   
5. Task Service → Client: Response
   - ถ้า JWT valid: ประมวลผล request
   - ถ้า JWT invalid: 401 Unauthorized
```

### Role-based Authorization

- **Member**: สร้าง, อ่าน, แก้ไข, ลบ task ของตัวเองได้
- **Admin**: ทำได้ทุกอย่าง + ดูรายชื่อผู้ใช้ทั้งหมดได้
- การตรวจสอบสิทธิ์เกิดที่ Task Service ก่อนประมวลผล request

## 📊 API Endpoints

### Auth Service (Port 3001)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | สมัครสมาชิก | No |
| POST | `/api/auth/login` | เข้าสู่ระบบ | No |
| GET | `/api/auth/verify` | ตรวจสอบ token | Yes (Bearer) |

**ตัวอย่างการ login:**
```bash
curl -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'
```

### Task Service (Port 3002)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/tasks/` | ดู task ทั้งหมด | Yes |
| POST | `/api/tasks/` | สร้าง task ใหม่ | Yes |
| GET | `/api/tasks/:id` | ดู task รายเดียว | Yes |
| PUT | `/api/tasks/:id` | แก้ไข task | Yes |
| DELETE | `/api/tasks/:id` | ลบ task | Yes |

**ตัวอย่างการสร้าง task:**
```bash
curl -X POST https://localhost/api/tasks/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Task","description":"Test description","status":"TODO","priority":"medium"}'
```

### Log Service (Port 3003)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/logs/` | ดู logs | Yes |
| GET | `/api/logs/stats` | ดูสถิติ logs | Yes |
| POST | `/api/logs/internal` | ส่ง log จาก services | Internal Only |

## 🛡️ คุณสมบัติด้านความปลอดภัย

### 1. Authentication & Authorization
- **JWT**: Token-based authentication พร้อม expiration
- **Password Hashing**: ใช้ bcrypt สำหรับการ hash รหัสผ่าน
- **Role-based Access**: แยกสิทธิ์ระหว่าง member กับ admin

### 2. Rate Limiting
- **Login Protection**: จำกัด 5 ครั้งต่อนาที ป้องกัน brute force
- **API Protection**: จำกัด 30 ครั้งต่อนาที ป้องกัน DDoS
- **Burst Handling**: อนุญาต burst พร้อมการจัดการที่เหมาะสม

### 3. HTTPS & TLS
- **TLS Termination**: ที่ Nginx พร้อม TLS 1.2/1.3
- **HSTS**: บังคับใช้ HTTPS
- **Security Headers**: ป้องกัน XSS, clickjacking, MIME sniffing

### 4. Centralized Logging
- **Structured Logs**: บันทึกทุก request/response
- **Security Events**: บันทึกการ login, JWT errors, 403 forbidden
- **Log Dashboard**: ดู logs ผ่านเว็บอินเตอร์เฟซ

### 5. Database Security
- **Shared Database**: ใช้ database เดียวกันแต่แยก schema ด้วยตาราง
- **Foreign Key Constraints**: รักษาความสมบูรณ์ของข้อมูล
- **Index Optimization**: เพิ่มประสิทธิภาพการ query

## 🔧 การพัฒนาและ Debug

### ดู log ของแต่ละ service
```bash
# ดู log ทั้งหมด
docker-compose logs -f

# ดู log ของ service เดียว
docker-compose logs -f auth-service
docker-compose logs -f task-service
docker-compose logs -f log-service
```

### เข้าถึง database
```bash
# เข้า PostgreSQL
docker-compose exec postgres psql -U admin -d taskboard

# ดู users
SELECT id, username, email, role FROM users;

# ดู tasks
SELECT id, title, status, priority, owner_id FROM tasks;

# ดู logs
SELECT service, level, event, created_at FROM logs ORDER BY created_at DESC LIMIT 10;
```

### ทดสอบ API ด้วย curl

**1. ขอ token ก่อน:**
```bash
TOKEN=$(curl -s -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | jq -r .token)
```

**2. ใช้ token กับ API:**
```bash
curl -H "Authorization: Bearer $TOKEN" https://localhost/api/tasks/
```

## 🚨 การแก้ไขปัญหาเบื้องต้น

### ปัญหา port ซ้อนทับ
```bash
# ตรวจสอบ port ที่ใช้งาน
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# ถ้ามี service อื่นใช้ port อยู่ ให้ stop ก่อน
sudo systemctl stop apache2  # หรือ nginx อื่นๆ
```

### ปัญหา database connection
```bash
# ตรวจสอบ database ขึ้นหรือยัง
docker-compose ps

# ดู log database
docker-compose logs postgres

# ถ้ายังไม่ขึ้น รอสักครู่หรือ restart
docker-compose restart postgres
```