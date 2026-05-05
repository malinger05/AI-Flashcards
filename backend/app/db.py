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
    """Safely add any new columns to existing tables without data loss."""
    with engine.connect() as conn:
        # flashcards table
        fc_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(flashcards)")).fetchall()}
        if "correct_count" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0"))
        if "wrong_count" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN wrong_count INTEGER NOT NULL DEFAULT 0"))
        if "user_id" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN user_id INTEGER REFERENCES users(id)"))

        # quiz_sessions table (may not exist yet - that's fine, create_all handles it)
        qs_exists = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='quiz_sessions'")).fetchone()
        if qs_exists:
            qs_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(quiz_sessions)")).fetchall()}
            if "user_id" not in qs_cols:
                conn.execute(text("ALTER TABLE quiz_sessions ADD COLUMN user_id INTEGER REFERENCES users(id)"))

        conn.commit()