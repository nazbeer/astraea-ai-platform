#!/usr/bin/env python3
"""
Database initialization script.
Creates all tables in the configured database.
"""

import os
import sys

# Add the parent directory to path to import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SQLALCHEMY_DATABASE_URL, is_postgres
from app import models

def init_database():
    """Initialize the database with all tables."""
    print(f"Database URL: {SQLALCHEMY_DATABASE_URL}")
    print(f"Database Type: {'PostgreSQL' if is_postgres else 'SQLite'}")
    print("\nCreating tables...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
        
        # List created tables
        if is_postgres:
            from sqlalchemy import inspect
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            print(f"\nTables in database:")
            for table in tables:
                print(f"  - {table}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)
