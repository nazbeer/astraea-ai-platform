# PostgreSQL Setup Guide (Supabase)

This guide explains how to configure the Astraea backend to use PostgreSQL via Supabase.

## Changes Made

1. **Updated `requirements.txt`** - Added `psycopg2-binary` for PostgreSQL support
2. **Updated `app/config.py`** - Added `DATABASE_URL` configuration
3. **Updated `app/database.py`** - Added PostgreSQL connection handling with connection pooling
4. **Created `init_db.py`** - Script to initialize database tables

## Setup Steps

### 1. Update Environment Variables

Edit your `backend/.env` file and add the DATABASE_URL:

```bash
# PostgreSQL Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@db.xkhgkyhcebwyfyozzudm.supabase.co:5432/postgres
```

**Note**: Replace `[password]` with your actual Supabase database password.

### 2. Install PostgreSQL Dependencies

```bash
cd backend

# Activate virtual environment
source aivenv/bin/activate  # On Windows: aivenv\Scripts\activate

# Install new dependencies
pip install psycopg2-binary
```

### 3. Initialize Database Tables

```bash
# Run the initialization script
python init_db.py
```

You should see output like:
```
Database URL: postgresql://postgres:****@db.xkhgkyhcebwyfyozzudm.supabase.co:5432/postgres
Database Type: PostgreSQL

Creating tables...
✅ Tables created successfully!

Tables in database:
  - users
  - custom_models
  - model_files
  - chat_sessions
  - messages
  - resumes
  - companies
  - jobs
  - job_applications
  - saved_jobs
```

### 4. Start the Backend

```bash
uvicorn app.main:app --reload
```

You should see in the logs:
```
INFO: Using PostgreSQL database
```

## Switching Back to SQLite

If you need to switch back to SQLite for local development:

1. Edit `backend/.env`:
```bash
# Comment out PostgreSQL
# DATABASE_URL=postgresql://...

# Use SQLite instead
DATABASE_URL=sqlite:///./storage/astraea.db
```

2. Restart the backend

## Troubleshooting

### Connection Errors

If you see connection errors:

1. **Check your password** - Make sure there are no special characters that need URL encoding
2. **Verify network access** - Ensure your IP is whitelisted in Supabase Dashboard → Settings → Database → Connection String → "IPv4" add your IP
3. **Check Supabase status** - Verify your Supabase project is active

### SSL/TLS Issues

If you encounter SSL errors, the connection should work with Supabase's SSL settings. If needed, you can modify `database.py` to add SSL parameters:

```python
if is_postgres:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={'sslmode': 'require'}  # Add this if needed
    )
```

### Table Already Exists

If you see "table already exists" errors, the tables were already created. This is fine - SQLAlchemy's `create_all()` is idempotent.

## Database Schema

The following tables are created:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (Google OAuth) |
| `custom_models` | User-trained AI models |
| `model_files` | Files uploaded for custom models |
| `chat_sessions` | Chat conversation sessions |
| `messages` | Individual chat messages |
| `resumes` | Candidate resumes |
| `companies` | Organization profiles |
| `jobs` | Job postings |
| `job_applications` | Job applications |
| `saved_jobs` | Saved job bookmarks |

## Backup & Restore

### Backup (Supabase Dashboard)
1. Go to Supabase Dashboard
2. Click on your project
3. Go to Database → Backups
4. Click "Backup Now"

### Restore
Use Supabase's built-in restore functionality or pg_dump/pg_restore for manual backups.

## Performance Notes

- Connection pooling is enabled with `pool_pre_ping=True` to verify connections
- Connections are recycled every 5 minutes (`pool_recycle=300`)
- PostgreSQL JSON columns are used for flexible data (skills, experience, etc.)
- Indexes are created on frequently queried fields (email, job titles, etc.)
