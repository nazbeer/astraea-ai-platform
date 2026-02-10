"""
Migration script to update saved_jobs table for external job support.
Run this script to add the new columns needed for external job saving.
"""

import os
import sys
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

def migrate():
    """Add new columns to saved_jobs table."""
    
    # Get database URL from settings
    db_url = settings.DATABASE_URL
    
    # Create engine
    engine = create_engine(db_url)
    
    is_postgres = "postgresql" in db_url.lower()
    
    with engine.connect() as connection:
        if is_postgres:
            # PostgreSQL - check if columns exist
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'saved_jobs' 
                AND column_name = 'external_job_id'
            """))
            
            if result.fetchone():
                print("Migration already applied - columns exist.")
                return
            
            print("Adding new columns to saved_jobs table (PostgreSQL)...")
            
            # Add new columns for PostgreSQL
            connection.execute(text("""
                ALTER TABLE saved_jobs 
                ADD COLUMN external_job_id VARCHAR,
                ADD COLUMN job_source VARCHAR DEFAULT 'internal',
                ADD COLUMN job_data JSONB DEFAULT '{}'::jsonb
            """))
            
            # Make job_id nullable
            connection.execute(text("""
                ALTER TABLE saved_jobs 
                ALTER COLUMN job_id DROP NOT NULL
            """))
            
            # Add unique constraint for external_job_id if not exists
            connection.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'unique_saved_job_external'
                    ) THEN
                        ALTER TABLE saved_jobs 
                        ADD CONSTRAINT unique_saved_job_external 
                        UNIQUE (user_id, external_job_id);
                    END IF;
                END $$;
            """))
            
            connection.commit()
            print("PostgreSQL migration completed successfully!")
            
        else:
            # SQLite migration
            result = connection.execute(text("PRAGMA table_info(saved_jobs)"))
            columns = [row[1] for row in result.fetchall()]
            
            print(f"Current columns: {columns}")
            
            if 'external_job_id' in columns:
                print("Migration already applied - columns exist.")
                return
            
            print("Recreating saved_jobs table with new schema (SQLite)...")
            
            # SQLite - recreate table
            connection.execute(text("""
                CREATE TABLE saved_jobs_new (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    job_id INTEGER,
                    external_job_id VARCHAR,
                    job_source VARCHAR DEFAULT 'internal',
                    job_data JSON DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (job_id) REFERENCES jobs (id),
                    UNIQUE (user_id, job_id),
                    UNIQUE (user_id, external_job_id)
                )
            """))
            
            # Copy data from old table
            connection.execute(text("""
                INSERT INTO saved_jobs_new (id, user_id, job_id, created_at)
                SELECT id, user_id, job_id, created_at FROM saved_jobs
            """))
            
            # Drop old table
            connection.execute(text("DROP TABLE saved_jobs"))
            
            # Rename new table
            connection.execute(text("ALTER TABLE saved_jobs_new RENAME TO saved_jobs"))
            
            connection.commit()
            print("SQLite migration completed successfully!")

if __name__ == "__main__":
    migrate()
