"""
Migration script to add new URL fields to the resumes table.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine, text
from app.database import SQLALCHEMY_DATABASE_URL, is_postgres

def migrate():
    """Add new URL columns to resumes table."""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    new_columns = [
        ("github_url", "VARCHAR"),
        ("twitter_url", "VARCHAR"),
        ("medium_url", "VARCHAR"),
        ("dribbble_url", "VARCHAR"),
        ("other_url", "VARCHAR"),
    ]
    
    with engine.connect() as conn:
        for column_name, column_type in new_columns:
            try:
                if is_postgres:
                    # PostgreSQL syntax
                    check_sql = text(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name='resumes' AND column_name='{column_name}'
                    """)
                    result = conn.execute(check_sql).fetchone()
                    
                    if not result:
                        alter_sql = text(f"ALTER TABLE resumes ADD COLUMN {column_name} {column_type}")
                        conn.execute(alter_sql)
                        print(f"✅ Added column: {column_name}")
                    else:
                        print(f"⏭️  Column already exists: {column_name}")
                else:
                    # SQLite syntax
                    check_sql = text(f"PRAGMA table_info(resumes)")
                    result = conn.execute(check_sql).fetchall()
                    existing_columns = [row[1] for row in result]
                    
                    if column_name not in existing_columns:
                        alter_sql = text(f"ALTER TABLE resumes ADD COLUMN {column_name} {column_type}")
                        conn.execute(alter_sql)
                        print(f"✅ Added column: {column_name}")
                    else:
                        print(f"⏭️  Column already exists: {column_name}")
                
                conn.commit()
            except Exception as e:
                print(f"❌ Error adding column {column_name}: {e}")
                conn.rollback()
    
    print("\n✨ Migration completed!")

if __name__ == "__main__":
    migrate()
