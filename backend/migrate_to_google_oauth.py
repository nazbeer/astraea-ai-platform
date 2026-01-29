"""
Database Migration Script for Google OAuth
This script migrates the database from username/password authentication to Google OAuth.

WARNING: This will modify your database. Make a backup before running!
"""

import sqlite3
import os

def migrate_database():
    db_path = "storage/astraea.db"
    
    if not os.path.exists(db_path):
        print("Database not found. No migration needed.")
        return
    
    print("Starting database migration...")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if migration is needed
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'google_id' in columns:
            print("Database already migrated!")
            return
        
        print("Creating backup...")
        # Backup current users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users_backup AS 
            SELECT * FROM users
        """)
        
        print("Dropping old users table...")
        # Drop old table
        cursor.execute("DROP TABLE users")
        
        print("Creating new users table with Google OAuth fields...")
        # Create new users table with Google OAuth fields
        cursor.execute("""
            CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                email VARCHAR UNIQUE,
                google_id VARCHAR UNIQUE,
                username VARCHAR,
                request_count INTEGER DEFAULT 0,
                tier VARCHAR DEFAULT 'Free',
                is_premium INTEGER DEFAULT 0
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX ix_users_id ON users (id)")
        cursor.execute("CREATE INDEX ix_users_email ON users (email)")
        cursor.execute("CREATE INDEX ix_users_google_id ON users (google_id)")
        
        conn.commit()
        print("Migration completed successfully!")
        print("\nNOTE: All existing users have been backed up to 'users_backup' table.")
        print("Users will need to sign in again with Google OAuth.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        print("Migration rolled back.")
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Google OAuth Database Migration")
    print("=" * 60)
    print("\nThis will migrate your database to use Google OAuth.")
    print("Your existing users will be backed up but will need to")
    print("sign in again with Google.")
    print("\nPress Ctrl+C to cancel, or Enter to continue...")
    
    try:
        input()
        migrate_database()
    except KeyboardInterrupt:
        print("\n\nMigration cancelled.")
