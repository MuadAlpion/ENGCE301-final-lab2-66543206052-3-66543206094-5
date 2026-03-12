# 🏗️ Task Board Architecture Diagram - คำอธิบาย

## 📋 ภาพรวม

Architecture diagram นี้แสดงโครงสร้างระบบ Task Board แบบ Microservices ที่มีการแยกชั้น (Layer) อย่างชัดเจนและมีการจัดการด้านความปลอดภัยแบบครบวงจร

## 🎯 วัตถุประสงค์

- แสดงการแยกส่วนของระบบตามสถาปัตยกรรม Microservices
- แสดงการจัดการด้านความปลอดภัยในแต่ละชั้น
- แสดงการไหลของข้อมูลและคำขอ (Data Flow)
- แสดง Security Zones และการควบคุมการเข้าถึง

## 🏗️ ชั้นของระบบ (System Layers)

### 1. ชั้นนำเสนอ (Presentation Layer) 🟦
**หน้าที่**: เป็นจุดติดต่อระหว่างผู้ใช้งานกับระบบ

- **ผู้ใช้งาน (Client)**: ผู้ใช้งานที่เข้าถึงระบบผ่าน Web Browser
- **แอปพลิเคชันเว็บ (Frontend)**: 
  - หน้าเว็บหลัก (index.html) สำหรับจัดการ Task
  - หน้า Log Dashboard (logs.html) สำหรับดูข้อมูลการใช้งาน
  - เป็น Single Page Application (SPA)

### 2. ชั้นเครือข่ายและความปลอดภัย (Network & Security Layer) 🟢
**หน้าที่**: ทำหน้าที่เป็นเกราะป้องกันและควบคุมการเข้าถึง

- **Nginx API Gateway**:
  - Load Balancer: กระจายโหลดไปยัง services ต่างๆ
  - Reverse Proxy: ทำหน้าที่เป็นตัวกลางระหว่าง frontend กับ backend services
  - SSL Termination: รับ HTTPS จาก client แล้วแปลงเป็น HTTP ภายใน

- **ไฟร์วอลล์ (Firewall)**:
  - ควบคุมการเข้าถึงตาม Security Rules
  - ป้องกันการเข้าถึงที่ไม่พึงประสงค์

- **TLS/SSL Termination**:
  - จัดการการเข้ารหัส HTTPS
  - แปลง HTTPS เป็น HTTP สำหรับการสื่อสารภายใน

- **Rate Limiting**:
  - ป้องกันการโจมตีแบบ Brute Force (Login: สูงสุด 5 ครั้ง/นาที)
  - ป้องกันการโจมตีแบบ DDoS (API: สูงสุด 30 ครั้ง/นาที)

### 3. ชั้นประยุกต์ (Application Layer) 🟠
**หน้าที่**: ประมวลผลตรรกะทางธุรกิจและให้บริการต่างๆ

- **Auth Service (Port 3001)**:
  - รับผิดชอบการพิสูจน์ตัวตน (Authentication)
  - จัดการการลงทะเบียนและเข้าสู่ระบบ
  - สร้างและตรวจสอบ JWT Token
  - ควบคุมสิทธิ์การเข้าถึง (Authorization)

- **Task Service (Port 3002)**:
  - รับผิดชอบตรรกะทางธุรกิจหลัก
  - จัดการการสร้าง, อ่าน, แก้ไข, ลบ Task
  - ตรวจสอบสิทธิ์ผู้ใช้งานก่อนประมวลผล
  - สื่อสารกับ Auth Service เพื่อยืนยันตัวตน

- **Log Service (Port 3003)**:
  - รับและจัดเก็บข้อมูลการใช้งานจาก services อื่นๆ
  - ให้บริการดูข้อมูลการใช้งานและสถิติ
  - ใช้สำหรับการตรวจสอบความปลอดภัยและการ debug

### 4. ชั้นข้อมูล (Data Layer) 🟣
**หน้าที่**: จัดเก็บและจัดการข้อมูลของระบบ

- **PostgreSQL Database**:
  - จัดเก็บข้อมูลผู้ใช้งาน (Users)
  - จัดเก็บข้อมูล Task (Tasks)
  - จัดเก็บข้อมูลการใช้งาน (Logs)
  - ใช้ Foreign Key Constraints เพื่อรักษาความสมบูรณ์ของข้อมูล

## 🔒 Security Zones

### เขต DMZ (Demilitarized Zone) 🔵
- **ลักษณะ**: พื้นที่กึ่งปลอดภัยที่สามารถเข้าถึงจากภายนอกได้
- **ส่วนประกอบ**: Frontend, Nginx, Firewall, TLS/SSL, Rate Limiting
- **หน้าที่**: ทำหน้าที่เป็นตัวกลางระหว่างโลกภายนอกกับเครือข่ายภายใน

### เครือข่ายภายใน (Internal Network) 🟣
- **ลักษณะ**: พื้นที่ปลอดภัยที่จำกัดการเข้าถึง
- **ส่วนประกอบ**: Auth Service, Task Service, Log Service, Database
- **หน้าที่**: ประมวลผลข้อมูลและจัดเก็บข้อมูลสำคัญ

## 🔄 การไหลของข้อมูล (Data Flow)

### 1. การเข้าถ้าเว็บไซต์
```
Client → Frontend → Nginx → TLS Termination → Rate Limiting
```

### 2. การเข้าสู่ระบบ
```
Client → Frontend → Nginx → Auth Service → Database (Verify) → JWT Token
```

### 3. การใช้งาน Task
```
Client → Frontend → Nginx → Task Service → Auth Service (Verify JWT) → Database
```

### 4. การบันทึกข้อมูล
```
Services → Log Service → Database
```

## 🛡️ คุณสมบัติด้านความปลอดภัย

### 1. Authentication & Authorization
- ใช้ JWT Token สำหรับการพิสูจน์ตัวตน
- มีการตรวจสอบสิทธิ์ตาม Role (Member/Admin)
- Token มี expiration time เพื่อความปลอดภัย

### 2. Network Security
- การแยก Security Zones ชัดเจน
- การใช้ Firewall ควบคุมการเข้าถึง
- การใช้ HTTPS สำหรับการสื่อสารจากภายนอก

### 3. Rate Limiting
- ป้องกันการโจมตีแบบ Brute Force
- ป้องกันการโจมตีแบบ DDoS
- มีการตั้งค่า burst handling

### 4. Centralized Logging
- บันทึกการใช้งานทุกครั้ง
- ใช้สำหรับการตรวจสอบความปลอดภัย
- ใช้สำหรับการ debug และ troubleshooting

## 📊 การใช้งาน Diagram

### สำหรับนักพัฒนา
- เข้าใจโครงสร้างระบบโดยรวม
- เข้าใจการแยกส่วนตาม Microservices
- เข้าใจการไหลของข้อมูล

### สำหรับผู้ดูแลระบบ
- เข้าใจการจัดการด้านความปลอดภัย
- เข้าใจการแยก Security Zones
- เข้าใจการควบคุมการเข้าถึง

### สำหรับนักเรียน
- เข้าใจหลักการของ Microservices Architecture
- เข้าใจการ implement ความปลอดภัยในระบบ
- เข้าใจการแยกชั้นของระบบ

## 🎨 สีและสัญลักษณ์

- **🔵 สีฟ้า**: ชั้นนำเสนอ (Presentation Layer)
- **🟢 สีเขียว**: ความปลอดภัย (Security)
- **🟠 สีส้ม**: การจัดการ (Management)
- **🟣 สีม่วง**: ข้อมูล (Data)
- **เส้นลูกศร**: แสดงทิศทางการไหลของข้อมูล

---

**หมายเหตุ**: Diagram นี้สามารถ import เข้าไปใน draw.io ได้โดยตรง และสามารถแก้ไข style, สี, ข้อความได้ตามต้องการ