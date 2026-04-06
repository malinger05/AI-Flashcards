from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .ai import generate_flashcards
from .db import Base, engine, get_db
from .models import Flashcard
from .schemas import FlashcardCreate, FlashcardOut, GenerateRequest


app = FastAPI(title="AI Flashcard Generator API")

# Allow fronted to call backend (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/generate")
def generate(payload: GenerateRequest):
    flashcards = generate_flashcards(payload.text)
    if not flashcards:
        raise HTTPException(status_code=422, detail="Unable to generate valid flashcards from AI response.")
    return {"flashcards": flashcards}


@app.post("/flashcards", response_model=list[FlashcardOut])
def save_flashcards(payload: list[FlashcardCreate], db: Session = Depends(get_db)):
    rows: list[Flashcard] = []
    for card in payload:
        row = Flashcard(question=card.question, answer=card.answer)
        db.add(row)
        rows.append(row)
    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


@app.get("/flashcards", response_model=list[FlashcardOut])
def get_flashcards(db: Session = Depends(get_db)):
    return db.query(Flashcard).order_by(Flashcard.created_at.desc()).all()
