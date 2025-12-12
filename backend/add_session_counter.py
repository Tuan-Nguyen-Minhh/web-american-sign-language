"""
Migration script to add total_detection_sessions column to users table
Run this once: python backend/add_session_counter.py
"""

from sqlalchemy import text, create_engine
from config import DATABASE_URL

def add_session_counter_column():
    """Add total_detection_sessions column to users table"""
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Add the column with default value 0
            conn.execute(text("""
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS total_detection_sessions INTEGER DEFAULT 0;
            """))
            conn.commit()
            print("✅ Successfully added total_detection_sessions column to users table")
            
            # Update existing users to have 0 sessions
            conn.execute(text("""
                UPDATE users 
                SET total_detection_sessions = 0 
                WHERE total_detection_sessions IS NULL;
            """))
            conn.commit()
            print("✅ Updated existing users with default value 0")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    print("Starting migration...")
    add_session_counter_column()
    print("Migration complete!")
