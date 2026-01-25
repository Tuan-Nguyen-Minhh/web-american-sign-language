# Web American Sign Language

## Settings
#### 1. Clone repo:
```bash
git clone https://github.com/Tuan-Nguyen-Minhh/web-american-sign-language.git
```

#### 2. Environment setup (on Windows):
Install a virtual environment

```bash
python -m venv asl_env
```

Activate the virtual environment (cmd/VS Code)
```bash
asl_env\Scripts\activate
```

Install the required libraries
```bash
pip install -r requirements.txt
```

#### 3. Install PostgreSQL and register an account (remember the PostgreSQL username & password)
- Visit: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- After installation, open pgAdmin 4, log in, and create a new database named `asl_db`

#### 4. Set up file environment
Create .env file inside folder backend
```bash
# JWT configuration
SECRET_KEY=YOUR_KEY
ALGORITHM=YOUR_ALGORITHM

# Postgresql url
DATABASE_URL=postgresql://user_name:pass_word@localhost:port/asl_db
```

**`Note`**
- user_name : your PostgreSQL account username.
- pass_word : your PostgreSQL account password.
- port : the PostgreSQL port number.
- YOUR_KEY : your secret string used to verify JWT tokens.
- YOUR_ALGORITHM : your hashing algorithm used for JWT encoding.

#### 5. Download Detection model (ONNX) and SVM model (.joblib)
Access [__link__](https://drive.google.com/drive/folders/1VW3WpQZ2_U1GL5imO4qwd2ejglzpvFiE?usp=sharing) and download model
- Put Detection model (best.onnx) in /frontend/public/models/
- Put SVM model (svm.joblib) in /backend/detection/

#### 6. Run the Web
Open 2 Cmd terminals
**`Terminal 1`**
- Activate the virtual environment
```bash
asl_env\Scripts\activate
```
- Run backend
```bash
uvicorn backend.main:app --reload
```

**`Terminal 2`**
- Go inside folder frontend
```bash
cd frontend
```
```bash
npm install
```
- Run frontend
```bash
npm run dev
```
Open `http://localhost:5173/` from Terminal 2 and enjoy the result ^_^