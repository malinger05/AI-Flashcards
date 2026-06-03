import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./flashcards.db")

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
    """
    Safe, additive migrations — never drops data.
    Each ALTER TABLE is guarded by a column-existence check.
    """
    with engine.connect() as conn:

        # ── flashcards ────────────────────────────────────────────────────────
        fc_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(flashcards)")).fetchall()}

        if "correct_count" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN correct_count INTEGER NOT NULL DEFAULT 0"))
        if "wrong_count" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN wrong_count INTEGER NOT NULL DEFAULT 0"))
        if "user_id" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN user_id INTEGER REFERENCES users(id)"))
        # BL-001: deck column — default "General" for all existing cards
        if "deck" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN deck TEXT NOT NULL DEFAULT 'General'"))
        # SCRUM-78: spaced repetition — when the card is next due for study
        if "next_review_at" not in fc_cols:
            conn.execute(text("ALTER TABLE flashcards ADD COLUMN next_review_at DATETIME"))
        if "review_step" not in fc_cols:
            conn.execute(text(
                "ALTER TABLE flashcards ADD COLUMN review_step INTEGER NOT NULL DEFAULT 0"
            ))

        # ── user_sessions ─────────────────────────────────────────────────────
        us_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(user_sessions)")).fetchall()}

        # SCRUM-91: backfill last_used_at for existing deployments
        if "last_used_at" not in us_cols:
            conn.execute(text(
                "ALTER TABLE user_sessions ADD COLUMN last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP"
            ))

        # ── study_sessions ────────────────────────────────────────────────────
        ss_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='study_sessions'")
        ).fetchone()
        if ss_exists:
            ss_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(study_sessions)")).fetchall()}
            if "flashcard_ids" not in ss_cols:
                conn.execute(text("ALTER TABLE study_sessions ADD COLUMN flashcard_ids TEXT NOT NULL DEFAULT ''"))

        # ── quiz_sessions ─────────────────────────────────────────────────────
        qs_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='quiz_sessions'")
        ).fetchone()
        if qs_exists:
            qs_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(quiz_sessions)")).fetchall()}
            if "user_id" not in qs_cols:
                conn.execute(text("ALTER TABLE quiz_sessions ADD COLUMN user_id INTEGER REFERENCES users(id)"))

        conn.commit()