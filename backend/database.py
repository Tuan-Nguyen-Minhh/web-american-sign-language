from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL  # Remove the dot

SQLALCHEMY_DATABASE_URL = DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_database():
    from . import models
    from .jwt_token import hash_password
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created/verified")
    
    # Create default admin if not exists
    db = SessionLocal()
    try:
        admin = db.query(models.User).filter(
            models.User.role == models.UserRole.ADMIN
        ).first()
        
        if not admin:
            # Create default admin
            default_admin = models.User(
                name="admin",
                email="admin@gmail.com",
                password=hash_password("admin123"),
                role=models.UserRole.ADMIN
            )
            db.add(default_admin)
            db.commit()
            db.refresh(default_admin)
            
            print("=" * 50)
            print("✓ Default admin user created!")
            print("=" * 50)
            print(f"Email: {default_admin.email}")
            print(f"Password: admin123")
            print(f"Role: {default_admin.role.value}")
            print("=" * 50)
            print("⚠️  Change password after first login!")
            print("=" * 50)
        else:
            print(f"✓ Admin user already exists: {admin.email}")
            
    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()