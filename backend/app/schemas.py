from datetime import datetime

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
    created_at: datetime

    class Config:
        from_attributes = True
