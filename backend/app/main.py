import json
import os
import random

from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .ai import (
    generate_flashcards,
    generate_flashcards_from_image,
    generate_flashcards_from_pdf,
    check_answer,
)
from .auth import generate_token, hash_password, verify_password
from .db import Base, engine, get_db, run_migrations
from .models import (
    Deck, DeckCard,
    Flashcard, QuizSession, User, UserSession,
    StudySession, StudySessionResult,
)
from .schemas import (
    AnswerRequest, AnswerResult, AuthResponse,
    DeckAddCards, DeckCreate, DeckOut,
    FlashcardCreate, FlashcardOut, FlashcardUpdate, GenerateRequest,
    LoginRequest, QuizCardOut, QuizStartRequest,
    QuizSummary, RegisterRequest, UserOut,
    StudySessionCreate, StudySessionOut,
    StudySessionResultOut,
)

app = FastAPI(title="AI Flashcard Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    run_migrations()


# ── Auth helpers ──────────────────────────────────────────────────────────────

def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = authorization[7:]
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=payload.name.strip(), email=email, password=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    token = generate_token(user.id)
    db.add(UserSession(token=token, user_id=user.id)); db.commit()
    return AuthResponse(token=token, user=UserOut.model_validate(user))

@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user  = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = generate_token(user.id)
    db.add(UserSession(token=token, user_id=user.id)); db.commit()
    return AuthResponse(token=token, user=UserOut.model_validate(user))

@app.post("/auth/logout")
def logout(authorization: str = Header(...), db: Session = Depends(get_db)):
    if authorization.startswith("Bearer "):
        db.query(UserSession).filter(UserSession.token == authorization[7:]).delete()
        db.commit()
    return {"status": "ok"}

@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Generate ──────────────────────────────────────────────────────────────────

@app.post("/generate")
def generate(payload: GenerateRequest, current_user: User = Depends(get_current_user)):
    try:
        flashcards = generate_flashcards(payload.text)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")
    return {"flashcards": flashcards}


@app.post("/generate/file")
async def generate_from_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Generate flashcards from an uploaded PDF or image file.

    - PDF: text is extracted with pypdf, then sent to the LLM.
    - Image (JPEG/PNG/WebP/GIF): sent directly to an Ollama vision model.

    Set OLLAMA_VISION_MODEL env var to point at a vision model (default: llava).
    """
    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()

    # Determine file type
    is_pdf = content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = content_type.startswith("image/") or any(
        filename.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")
    )

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload a PDF or image (JPEG, PNG, WebP).",
        )

    try:
        if is_pdf:
            flashcards = generate_flashcards_from_pdf(content)
        else:
            # Pass normalised media type to vision model
            media_type = content_type if content_type.startswith("image/") else "image/jpeg"
            flashcards = generate_flashcards_from_image(content, media_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    return {"flashcards": flashcards}


# ── Flashcards ────────────────────────────────────────────────────────────────

@app.post("/flashcards", response_model=list[FlashcardOut])
def save_flashcards(
    payload: list[FlashcardCreate],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = []
    for card in payload:
        row = Flashcard(question=card.question, answer=card.answer, user_id=current_user.id)
        db.add(row); rows.append(row)
    db.commit()
    for row in rows: db.refresh(row)
    return rows

@app.get("/flashcards", response_model=list[FlashcardOut])
def get_flashcards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Flashcard)
        .filter(Flashcard.user_id == current_user.id)
        .order_by(Flashcard.created_at.desc())
        .all()
    )

@app.patch("/flashcards/{flashcard_id}", response_model=FlashcardOut)
def update_flashcard(
    flashcard_id: int,
    payload: FlashcardUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Flashcard).filter(
        Flashcard.id == flashcard_id,
        Flashcard.user_id == current_user.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    if payload.question is not None:
        card.question = payload.question.strip()
    if payload.answer is not None:
        card.answer = payload.answer.strip()
    db.commit(); db.refresh(card)
    return card

@app.delete("/flashcards/{flashcard_id}")
def delete_flashcard(
    flashcard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(Flashcard).filter(
        Flashcard.id == flashcard_id,
        Flashcard.user_id == current_user.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    # Remove from any decks first
    db.query(DeckCard).filter(DeckCard.flashcard_id == flashcard_id).delete()
    db.delete(card); db.commit()
    return {"status": "deleted"}


# ── Decks ─────────────────────────────────────────────────────────────────────

def _deck_out(deck: Deck, db: Session) -> dict:
    card_rows = db.query(DeckCard).filter(DeckCard.deck_id == deck.id).all()
    ids = {r.flashcard_id for r in card_rows}
    return {
        "id": deck.id,
        "name": deck.name,
        "card_count": len(ids),
        "flashcard_ids": ids,
        "created_at": deck.created_at,
    }

@app.post("/decks", response_model=DeckOut)
def create_deck(
    payload: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = Deck(name=payload.name.strip(), user_id=current_user.id)
    db.add(deck); db.commit(); db.refresh(deck)
    return _deck_out(deck, db)

@app.get("/decks", response_model=list[DeckOut])
def list_decks(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    decks = db.query(Deck).filter(Deck.user_id == current_user.id).order_by(Deck.created_at.desc()).all()
    return [_deck_out(d, db) for d in decks]

@app.post("/decks/{deck_id}/cards")
def add_cards_to_deck(
    deck_id: int,
    payload: DeckAddCards,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    existing = {r.flashcard_id for r in db.query(DeckCard).filter(DeckCard.deck_id == deck_id).all()}
    for card_id in payload.flashcard_ids:
        if card_id not in existing:
            # Verify card belongs to user
            card = db.query(Flashcard).filter(
                Flashcard.id == card_id, Flashcard.user_id == current_user.id
            ).first()
            if card:
                db.add(DeckCard(deck_id=deck_id, flashcard_id=card_id))
    db.commit()
    return {"status": "ok"}

@app.delete("/decks/{deck_id}/cards/{flashcard_id}")
def remove_card_from_deck(
    deck_id: int,
    flashcard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    db.query(DeckCard).filter(
        DeckCard.deck_id == deck_id, DeckCard.flashcard_id == flashcard_id
    ).delete()
    db.commit()
    return {"status": "ok"}

@app.delete("/decks/{deck_id}")
def delete_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deck = db.query(Deck).filter(Deck.id == deck_id, Deck.user_id == current_user.id).first()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found.")
    db.query(DeckCard).filter(DeckCard.deck_id == deck_id).delete()
    db.delete(deck); db.commit()
    return {"status": "deleted"}


# ── Quiz ──────────────────────────────────────────────────────────────────────

@app.post("/quiz/start", response_model=QuizCardOut)
def quiz_start(
    payload: QuizStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.flashcard_ids:
        cards = db.query(Flashcard).filter(
            Flashcard.id.in_(payload.flashcard_ids),
            Flashcard.user_id == current_user.id,
        ).all()
    else:
        all_cards = db.query(Flashcard).filter(Flashcard.user_id == current_user.id).all()
        if not all_cards:
            raise HTTPException(status_code=404, detail="No flashcards saved yet.")
        weights = [max(1, c.wrong_count + 1) for c in all_cards]
        k = min(payload.count, len(all_cards))
        cards = random.choices(all_cards, weights=weights, k=k)
        seen: set[int] = set(); unique = []
        for c in cards:
            if c.id not in seen: seen.add(c.id); unique.append(c)
        remaining = [c for c in all_cards if c.id not in seen]
        random.shuffle(remaining)
        unique.extend(remaining[:k - len(unique)])
        cards = unique

    if not cards:
        raise HTTPException(status_code=404, detail="No matching flashcards found.")
    random.shuffle(cards)
    ids_str = ",".join(str(c.id) for c in cards)
    session = QuizSession(flashcard_ids=ids_str, user_id=current_user.id)
    db.add(session); db.commit(); db.refresh(session)
    return QuizCardOut(
        session_id=session.id, card_index=0,
        total_cards=len(cards), flashcard_id=cards[0].id, question=cards[0].question,
    )

@app.post("/quiz/answer", response_model=AnswerResult)
def quiz_answer(
    payload: AnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(QuizSession).filter(
        QuizSession.id == payload.session_id, QuizSession.user_id == current_user.id
    ).first()
    if not session: raise HTTPException(status_code=404, detail="Quiz session not found.")
    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index
    if idx >= len(card_ids): raise HTTPException(status_code=400, detail="Quiz already finished.")
    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    if not card: raise HTTPException(status_code=404, detail="Flashcard not found.")

    result = check_answer(card.question, card.answer, payload.user_answer)
    verdict = result["verdict"]
    reason  = result["reason"]

    is_correct = verdict == "correct"
    is_partial = verdict == "partial"

    if is_correct:
        card.correct_count += 1
        session.correct_count += 1
    else:
        card.wrong_count += 1
        session.wrong_count += 1

    session.current_index = idx + 1
    db.commit()
    is_last = session.current_index >= len(card_ids)
    return AnswerResult(
        correct=is_correct, partial=is_partial,
        verdict=verdict, reason=reason,
        correct_answer=card.answer, user_answer=payload.user_answer,
        session_id=session.id, card_index=idx,
        total_cards=len(card_ids), is_last=is_last,
    )

@app.get("/quiz/{session_id}/next", response_model=QuizCardOut)
def quiz_next(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(QuizSession).filter(
        QuizSession.id == session_id, QuizSession.user_id == current_user.id
    ).first()
    if not session: raise HTTPException(status_code=404, detail="Quiz session not found.")
    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index
    if idx >= len(card_ids): raise HTTPException(status_code=400, detail="No more cards.")
    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    if not card: raise HTTPException(status_code=404, detail="Flashcard not found.")
    return QuizCardOut(
        session_id=session.id, card_index=idx,
        total_cards=len(card_ids), flashcard_id=card.id, question=card.question,
    )

@app.get("/quiz/{session_id}/summary", response_model=QuizSummary)
def quiz_summary(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(QuizSession).filter(
        QuizSession.id == session_id, QuizSession.user_id == current_user.id
    ).first()
    if not session: raise HTTPException(status_code=404, detail="Quiz session not found.")
    total = len(session.flashcard_ids.split(","))
    answered = session.correct_count + session.wrong_count
    score_pct = round((session.correct_count / answered) * 100) if answered else 0
    return QuizSummary(
        session_id=session.id, total_cards=total,
        correct_count=session.correct_count, wrong_count=session.wrong_count, score_pct=score_pct,
    )


# ── Study History ─────────────────────────────────────────────────────────────

@app.post("/study/session", response_model=StudySessionOut)
def save_study_session(
    payload: StudySessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ids_str = ",".join(str(i) for i in payload.flashcard_ids)
    session = StudySession(
        user_id=current_user.id,
        correct=payload.correct,
        wrong=payload.wrong,
        total=payload.total,
        pct=payload.pct,
        flashcard_ids=ids_str,
    )
    db.add(session); db.commit(); db.refresh(session)
    for r in payload.results:
        fid = r.get("flashcard_id") or r.get("id")
        if fid is None:
            continue
        db.add(StudySessionResult(
            study_session_id=session.id,
            flashcard_id=fid,
            correct=1 if r.get("correct") else 0,
        ))
    db.commit()
    return session

@app.get("/study/history", response_model=list[StudySessionOut])
def get_study_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(StudySession)
        .filter(StudySession.user_id == current_user.id)
        .order_by(StudySession.created_at.desc())
        .limit(50)
        .all()
    )

@app.get("/study/history/{session_id}/cards", response_model=list[StudySessionResultOut])
def get_study_session_cards(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(StudySession).filter(
        StudySession.id == session_id,
        StudySession.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    results = db.query(StudySessionResult).filter(
        StudySessionResult.study_session_id == session_id
    ).all()

    out = []
    for r in results:
        card = db.query(Flashcard).filter(Flashcard.id == r.flashcard_id).first()
        if card:
            out.append(StudySessionResultOut(
                flashcard_id=r.flashcard_id, correct=bool(r.correct),
                question=card.question, answer=card.answer, deleted=False,
            ))
        else:
            out.append(StudySessionResultOut(
                flashcard_id=r.flashcard_id, correct=bool(r.correct),
                question="", answer="", deleted=True,
            ))
    return out