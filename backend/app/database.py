from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os

# Get database URL from settings
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Check if using PostgreSQL or SQLite
is_postgres = SQLALCHEMY_DATABASE_URL.startswith("postgresql")

# Export for use in other modules
__all__ = ['engine', 'SessionLocal', 'Base', 'get_db', 'SQLALCHEMY_DATABASE_URL', 'is_postgres']

if is_postgres:
    # PostgreSQL configuration
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=300,    # Recycle connections after 5 minutes
        echo=False
    )
else:
    # SQLite configuration (fallback)
    # Ensure storage directory exists
    if not os.path.exists("./storage"):
        os.makedirs("./storage")
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
