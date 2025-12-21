from backend.database import SessionLocal
from backend.models import User, UserRole
from backend.jwt_token import hash_password
import sys

# Create a new admin user or promote existing user to admin.
def create_admin_user(name=None, email=None, password=None):
    db = SessionLocal()
    
    try:
        # Default values
        if not name:
            name = "admin"
        if not email:
            email = "admin@example.com"
        if not password:
            password = "admin123"
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            # Promote existing user to admin
            if existing_user.role == UserRole.ADMIN:
                print(f" User is already an admin: {existing_user.name} (ID: {existing_user.id})")
            else:
                existing_user.role = UserRole.ADMIN
                db.commit()
                db.refresh(existing_user)
                print("=" * 50)
                print(" User promoted to admin!")
                print("=" * 50)
                print(f"Name: {existing_user.name}")
                print(f"Email: {existing_user.email}")
                print(f"Role: {existing_user.role.value}")
                print(f"ID: {existing_user.id}")
                print("=" * 50)
            return
        
        # Create new admin user
        admin = User(
            name=name,
            email=email,
            password=hash_password(password),
            role=UserRole.ADMIN
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("=" * 50)
        print("Admin user created successfully!")
        print("=" * 50)
        print(f"Name: {admin.name}")
        print(f"Email: {admin.email}")
        print(f"Password: {password}")
        print(f"Role: {admin.role.value}")
        print(f"ID: {admin.id}")
        print("=" * 50)
        print("You can now login with these credentials!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    name = input('Enter admin name : ')
    email = input('Enter admin\'s email: ')
    password = input('Enter admin\'s password: ')
    create_admin_user(name=name, email=email, password=password)