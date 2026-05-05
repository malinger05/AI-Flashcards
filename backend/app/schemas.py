from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:     str = Field(..., min_length=1)
    email:    str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email:    str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

class UserOut(BaseModel):
    id:         int
    name:       str
    email:      str
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    token: str      # simple session token stored in localStorage
    user:  UserOut


# ── Flashcards ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=5)

class FlashcardBase(BaseModel):
    question: str = Field(..., min_length=1)
    answer:   str = Field(..., min_length=1)

class FlashcardCreate(FlashcardBase):
    pass

#correct_count and wrong_count are new and added to the schema (response API)
class FlashcardOut(FlashcardBase):
    id:            int
    correct_count: int
    wrong_count:   int
    created_at:    datetime

    class Config:
        from_attributes = True


# ── Quiz ──────────────────────────────────────────────────────────────────────

class QuizStartRequest(BaseModel):
    flashcard_ids: list[int] = Field(default_factory=list)
    count:         int        = Field(default=10, ge=1, le=50)

class QuizCardOut(BaseModel):
    session_id:   int
    card_index:   int
    total_cards:  int
    flashcard_id: int
    question:     str

class AnswerRequest(BaseModel):
    session_id:  int
    user_answer: str = Field(..., min_length=1)

class AnswerResult(BaseModel):
    correct:        bool
    correct_answer: str
    user_answer:    str
    session_id:     int
    card_index:     int
    total_cards:    int
    is_last:        bool

class QuizSummary(BaseModel):
    session_id:    int
    total_cards:   int
    correct_count: int
    wrong_count:   int
    score_pct:     int