import random

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from ai import generate_flashcards
from db import Base, engine, get_db, run_migrations
from models import Flashcard, QuizSession
from schemas import (
    AnswerRequest,
    AnswerResult,
    FlashcardCreate,
    FlashcardOut,
    GenerateRequest,
    QuizCardOut,
    QuizStartRequest,
    QuizSummary,
)

app = FastAPI(title="AI Flashcard Generator API")

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
    run_migrations()   # safely adds new columns to existing DB


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/generate")
def generate(payload: GenerateRequest):
    try:
        flashcards = generate_flashcards(payload.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")
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


# ── Quiz endpoints ────────────────────────────────────────────────────────────

@app.post("/quiz/start", response_model=QuizCardOut)
def quiz_start(payload: QuizStartRequest, db: Session = Depends(get_db)):
    """SCRUM-35 / SCRUM-47: create a quiz session and return the first card.

    If flashcard_ids is provided, those cards are used (after shuffling).
    If empty, a random subset of `count` cards is picked from all saved cards.
    Wrong-heavy cards are prioritised when selecting the random subset (SCRUM-49).
    """
    if payload.flashcard_ids:
        cards = (
            db.query(Flashcard)
            .filter(Flashcard.id.in_(payload.flashcard_ids))
            .all()
        )
    else:
        all_cards = db.query(Flashcard).all()
        if not all_cards:
            raise HTTPException(status_code=404, detail="No flashcards saved yet.")

        # SCRUM-49: weight cards by wrong_count so frequently-missed cards
        # appear more often in random selection
        weights = [max(1, c.wrong_count + 1) for c in all_cards]
        k = min(payload.count, len(all_cards))
        cards = random.choices(all_cards, weights=weights, k=k)
        # deduplicate while preserving weighted order
        seen: set[int] = set()
        unique: list[Flashcard] = []
        for c in cards:
            if c.id not in seen:
                seen.add(c.id)
                unique.append(c)
        # if dedup left us short, top up from remaining cards
        remaining = [c for c in all_cards if c.id not in seen]
        random.shuffle(remaining)
        unique.extend(remaining[: k - len(unique)])
        cards = unique

    if not cards:
        raise HTTPException(status_code=404, detail="No matching flashcards found.")

    random.shuffle(cards)
    ids_str = ",".join(str(c.id) for c in cards)

    session = QuizSession(flashcard_ids=ids_str)
    db.add(session)
    db.commit()
    db.refresh(session)

    first_card = cards[0]
    return QuizCardOut(
        session_id=session.id,
        card_index=0,
        total_cards=len(cards),
        flashcard_id=first_card.id,
        question=first_card.question,
    )


@app.post("/quiz/answer", response_model=AnswerResult)
def quiz_answer(payload: AnswerRequest, db: Session = Depends(get_db)):
    """SCRUM-36 / 37 / 38 / 39 / 43 / 44: check the submitted answer,
    update flashcard stats, advance the session, return feedback + next card info.
    """
    session = db.query(QuizSession).filter(QuizSession.id == payload.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")

    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index

    if idx >= len(card_ids):
        raise HTTPException(status_code=400, detail="Quiz is already finished.")

    current_card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    if not current_card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")

    # SCRUM-37 / SCRUM-48: correctness check — exact match OR contains
    user_ans = payload.user_answer.strip().lower()
    correct_ans = current_card.answer.strip().lower()
    is_correct = user_ans == correct_ans or correct_ans in user_ans or user_ans in correct_ans

    # SCRUM-38 / SCRUM-39: update per-flashcard stats
    if is_correct:
        current_card.correct_count += 1
        session.correct_count += 1
    else:
        current_card.wrong_count += 1
        session.wrong_count += 1

    # advance session
    session.current_index = idx + 1
    db.commit()

    is_last = session.current_index >= len(card_ids)

    return AnswerResult(
        correct=is_correct,
        correct_answer=current_card.answer,
        user_answer=payload.user_answer,
        session_id=session.id,
        card_index=idx,
        total_cards=len(card_ids),
        is_last=is_last,
    )


@app.get("/quiz/{session_id}/next", response_model=QuizCardOut)
def quiz_next(session_id: int, db: Session = Depends(get_db)):
    """SCRUM-44: after answering, fetch the next card in the session."""
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")

    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index

    if idx >= len(card_ids):
        raise HTTPException(status_code=400, detail="No more cards — quiz is finished.")

    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")

    return QuizCardOut(
        session_id=session.id,
        card_index=idx,
        total_cards=len(card_ids),
        flashcard_id=card.id,
        question=card.question,
    )


@app.get("/quiz/{session_id}/summary", response_model=QuizSummary)
def quiz_summary(session_id: int, db: Session = Depends(get_db)):
    """SCRUM-45: return the final score summary for a completed session."""
    session = db.query(QuizSession).filter(QuizSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")

    total = len(session.flashcard_ids.split(","))
    answered = session.correct_count + session.wrong_count
    score_pct = round((session.correct_count / answered) * 100) if answered else 0

    return QuizSummary(
        session_id=session.id,
        total_cards=total,
        correct_count=session.correct_count,
        wrong_count=session.wrong_count,
        score_pct=score_pct,
    )