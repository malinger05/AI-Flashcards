from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func

from .db import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, nullable=False, index=True)
    password   = Column(String, nullable=False)          # bcrypt hash
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserSession(Base):
    """Maps a token string → user_id (simple stateful sessions)."""
    __tablename__ = "user_sessions"

    id         = Column(Integer, primary_key=True, index=True)
    token      = Column(String, unique=True, nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Flashcard(Base):
    __tablename__ = "flashcards"
    # SCRUM-49: Track user difficulty — used to bias future quiz selection toward missed cards.
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