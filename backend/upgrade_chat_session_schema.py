#!/usr/bin/env python3
"""
Safe in-place migration for SQLite to convert `chat_sessions.id` and related
`messages.session_id` from INTEGER to TEXT (UUID strings). This creates new
tables with the correct column types, copies data (casting ints to text), and
replaces the old tables.

Run from the repository root:
    python backend/upgrade_chat_session_schema.py

Back up `backend/storage/astraea.db` before running if you need to preserve data.
"""
import sqlite3
import shutil
from pathlib import Path

DB_PATH = Path(__file__).parent / "storage" / "astraea.db"

if not DB_PATH.exists():
    print(f"Database not found at {DB_PATH}")
    raise SystemExit(1)

bak = DB_PATH.with_suffix('.db.bak')
print(f"Backing up {DB_PATH} -> {bak}")
shutil.copy2(DB_PATH, bak)

conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cur = conn.cursor()

try:
    cur.execute('PRAGMA foreign_keys = OFF;')
    cur.execute('BEGIN TRANSACTION;')

    # Create new chat_sessions table with TEXT primary key
    cur.execute('''
    CREATE TABLE IF NOT EXISTS chat_sessions_new (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        title VARCHAR DEFAULT 'New Chat',
        created_at DATETIME,
        is_archived INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    ''')

    # Copy data, casting numeric ids to text
    cur.execute('''
    INSERT INTO chat_sessions_new (id, user_id, title, created_at, is_archived)
    SELECT CAST(id AS TEXT), user_id, title, created_at, is_archived FROM chat_sessions;
    ''')

    # Create new messages table where session_id is TEXT
    cur.execute('''
    CREATE TABLE IF NOT EXISTS messages_new (
        id INTEGER PRIMARY KEY,
        session_id TEXT,
        role VARCHAR,
        content VARCHAR,
        created_at DATETIME,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
    ''')

    cur.execute('''
    INSERT INTO messages_new (id, session_id, role, content, created_at)
    SELECT id, CAST(session_id AS TEXT), role, content, created_at FROM messages;
    ''')

    # Drop old tables
    cur.execute('DROP TABLE IF EXISTS messages;')
    cur.execute('DROP TABLE IF EXISTS chat_sessions;')

    # Rename new tables into place
    cur.execute('ALTER TABLE chat_sessions_new RENAME TO chat_sessions;')
    cur.execute('ALTER TABLE messages_new RENAME TO messages;')

    conn.commit()
    print('Migration applied successfully.')
finally:
    cur.execute('PRAGMA foreign_keys = ON;')
    conn.close()
