from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from .db import Base


class User(Base):
    __tablename__ = "users"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, nullable=False, index=True)
    password   = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserSession(Base):
    __tablename__ = "user_sessions"
    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String, unique=True, nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Flashcard(Base):
    __tablename__ = "flashcards"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question      = Column(String, nullable=False)
    answer        = Column(String, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    wrong_count   = Column(Integer, default=0, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    flashcard_ids = Column(String, nullable=False)
    current_index = Column(Integer, default=0, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    wrong_count   = Column(Integer, default=0, nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StudySession(Base):
    __tablename__ = "study_sessions"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    correct       = Column(Integer, nullable=False)
    wrong         = Column(Integer, nullable=False)
    total         = Column(Integer, nullable=False)
    pct           = Column(Integer, nullable=False)
    flashcard_ids = Column(String, nullable=False, default="")
    created_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class StudySessionResult(Base):
    __tablename__ = "study_session_results"
    id               = Column(Integer, primary_key=True, index=True)
    study_session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=False, index=True)
    flashcard_id     = Column(Integer, ForeignKey("flashcards.id"), nullable=False)
    correct          = Column(Integer, nullable=False)  # 1 = correct, 0 = wrong


# ── Deck system ───────────────────────────────────────────────────────────────

class Deck(Base):
    """Named collection of flashcards belonging to a user."""
    __tablename__ = "decks"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name       = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DeckCard(Base):
    """Many-to-many join between Deck and Flashcard."""
    __tablename__ = "deck_cards"
    id           = Column(Integer, primary_key=True, index=True)
    deck_id      = Column(Integer, ForeignKey("decks.id"), nullable=False, index=True)
    flashcard_id = Column(Integer, ForeignKey("flashcards.id"), nullable=False)