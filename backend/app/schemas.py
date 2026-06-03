from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


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
    token: str
    user:  UserOut

class ChangePasswordRequest(BaseModel):
    """BL-008: Change password for the authenticated user."""
    current_password: str = Field(..., min_length=1)
    new_password:     str = Field(..., min_length=6)


# ── Flashcards ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=5)

class FlashcardBase(BaseModel):
    question: str = Field(..., min_length=1)
    answer:   str = Field(..., min_length=1)

class FlashcardCreate(FlashcardBase):
    # BL-001: optional deck on create; defaults to "General" on the model
    deck: str = Field(default="General", min_length=1, max_length=80)

class FlashcardUpdate(BaseModel):
    """Partial update — all fields optional so callers can patch just one."""
    question: Optional[str] = Field(None, min_length=1)
    answer:   Optional[str] = Field(None, min_length=1)
    deck:     Optional[str] = Field(None, min_length=1, max_length=80)

class FlashcardOut(FlashcardBase):
    id:            int
    deck:          str
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
    partial:        bool = False
    verdict:        str  = "correct"
    reason:         str  = ""
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

class QuizHistoryOut(BaseModel):
    """BL-004: Quiz history entry — last 50 sessions, newest first."""
    id:         int
    created_at: datetime
    total:      int
    correct:    int
    wrong:      int
    score_pct:  int

    class Config:
        from_attributes = True


# ── Study History ─────────────────────────────────────────────────────────────

class StudySessionCreate(BaseModel):
    correct:       int
    wrong:         int
    total:         int
    pct:           int
    flashcard_ids: list[int] = Field(default_factory=list)
    results:       list[dict] = Field(default_factory=list)

class StudySessionOut(BaseModel):
    id:            int
    correct:       int
    wrong:         int
    total:         int
    pct:           int
    flashcard_ids: str
    created_at:    datetime

    class Config:
        from_attributes = True

class StudySessionResultOut(BaseModel):
    flashcard_id: int
    correct:      bool
    question:     str
    answer:       str
    deleted:      bool = False

    class Config:
        from_attributes = True


# ── Decks ─────────────────────────────────────────────────────────────────────

class DeckCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)

class DeckAddCards(BaseModel):
    flashcard_ids: list[int] = Field(..., min_length=1)

class DeckOut(BaseModel):
    id:            int
    name:          str
    card_count:    int = 0
    flashcard_ids: set[int] = Field(default_factory=set)
    created_at:    datetime

    class Config:
        from_attributes = True