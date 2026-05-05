from sqlalchemy import Column, DateTime, Integer, String, func

from db import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)   # SCRUM-46
    wrong_count = Column(Integer, default=0, nullable=False)     # SCRUM-46
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class QuizSession(Base):
    """Tracks an active quiz session (SCRUM-35, SCRUM-38)."""
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    flashcard_ids = Column(String, nullable=False)   # comma-separated list of IDs
    current_index = Column(Integer, default=0, nullable=False)
    correct_count = Column(Integer, default=0, nullable=False)
    wrong_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)