from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./flashcards.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Add new columns to existing tables without losing data.
    SQLite does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
    so we check existing columns first and only add what is missing.
    """
    with engine.connect() as conn:
        # ── flashcards table ──────────────────────────────────────────
        existing = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(flashcards)")).fetchall()
        }
        if "correct_count" not in existing:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0"))
        if "wrong_count" not in existing:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN wrong_count INTEGER NOT NULL DEFAULT 0"))
        conn.commit()