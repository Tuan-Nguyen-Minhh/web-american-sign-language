# Web American Sign Language

## Cài đặt
#### 1. Clone repo:
```bash
git clone https://github.com/Tuan-Nguyen-Minhh/web-american-sign-language.git
```

#### 2. Cài đặt môi trường (trên Windows):
Cài môi trường ảo

```bash
python -m venv asl_env
```

Kích hoạt môi trường ảo (cmd/vscode)
```bash
asl_env\Scripts\activate
```

Tải các libraries cần thiết
```bash
pip install -r requirements.txt
```

#### 3. Cài đặt Postgresql và Đăng ký tài khoản (nhớ username & password của Postgresql)
- Truy cập : https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- AE có thể tải PostgreSQL Version 16.10 cho đồng bộ với nhau (hoặc tùy chọn)

#### 4. Set up file environtment
Tạo file .env bên trong folder backend với nội dung 
```bash
# JWT configuration
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256

# Postgresql url
DATABASE_URL=postgresql://user-name:pass-word@localhost:port/asl_db
```

**`Lưu ý`**
- user-name : là tài khoản postgresql của mọi người
- pass-word : là mật khẩu postgresql của mọi người
- port : port của postgresql
- SECRET_KEY và ALGORITHM giữ nguyên, sau này khi thống nhất host chung một postgresql rồi thì mình tạo SECRET_KEY khác cho bảo mật sau.

#### 5. Lệnh chạy
Đứng ở ngoài folder backend
```bash
uvicorn backend.main:app --reload
```
