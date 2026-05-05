from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=5)


class FlashcardBase(BaseModel):
    question: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


class FlashcardCreate(FlashcardBase):
    pass


class FlashcardOut(FlashcardBase):
    id: int
    correct_count: int
    wrong_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Quiz schemas (SCRUM-35 / 36 / 37 / 38 / 45) ──────────────────────────────

class QuizStartRequest(BaseModel):
    """SCRUM-35: start a quiz from a set of saved flashcard IDs.
    If flashcard_ids is empty, a random subset is picked automatically (SCRUM-47)."""
    flashcard_ids: list[int] = Field(default_factory=list)
    count: int = Field(default=10, ge=1, le=50)   # SCRUM-47: subset size


class QuizCardOut(BaseModel):
    """One card as seen by the student — answer is intentionally omitted."""
    session_id: int
    card_index: int
    total_cards: int
    flashcard_id: int
    question: str


class AnswerRequest(BaseModel):
    """SCRUM-36 / 37: submit an answer for the current card."""
    session_id: int
    user_answer: str = Field(..., min_length=1)


class AnswerResult(BaseModel):
    """SCRUM-36 / 37 / 43: correctness feedback + correct answer."""
    correct: bool
    correct_answer: str
    user_answer: str
    session_id: int
    card_index: int
    total_cards: int
    is_last: bool


class QuizSummary(BaseModel):
    """SCRUM-45: full result summary returned when quiz is finished."""
    session_id: int
    total_cards: int
    correct_count: int
    wrong_count: int
    score_pct: int