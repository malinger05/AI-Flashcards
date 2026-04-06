from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .ai import generate_flashcards
from .db import Base, engine, get_db
from .models import Flashcard
from .schemas import FlashcardCreate, FlashcardOut, GenerateRequest


app = FastAPI(title="AI Flashcard Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/generate")
def generate(payload: GenerateRequest):
    flashcards = generate_flashcards(payload.text)
    if not flashcards:
        raise HTTPException(status_code=422, detail="Unable to generate valid flashcards from AI response.")
    return {"flashcards": flashcards}