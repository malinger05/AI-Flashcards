from sqlalchemy import Column, DateTime, Integer, String, func

from .db import Base


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
