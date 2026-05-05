import random

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .ai import generate_flashcards
from .auth import generate_token, hash_password, verify_password
from .db import Base, engine, get_db, run_migrations
from .models import Flashcard, QuizSession, User, UserSession
from .schemas import (
    AnswerRequest, AnswerResult, AuthResponse,
    FlashcardCreate, FlashcardOut, GenerateRequest,
    LoginRequest, QuizCardOut, QuizStartRequest,
    QuizSummary, RegisterRequest, UserOut,
)

app = FastAPI(title="AI Flashcard Generator API")

app.add_middleware(
    CORSMiddleware,
    # Dev frontend runs on localhost/127.0.0.1 with changing Vite ports.
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

# ── Flashcards ────────────────────────────────────────────────────────────────

@app.post("/flashcards", response_model=list[FlashcardOut])
def save_flashcards(payload: list[FlashcardCreate], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = []
    for card in payload:
        row = Flashcard(question=card.question, answer=card.answer, user_id=current_user.id)
        db.add(row); rows.append(row)
    db.commit()
    for row in rows: db.refresh(row)
    return rows

@app.get("/flashcards", response_model=list[FlashcardOut])
def get_flashcards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Flashcard).filter(Flashcard.user_id == current_user.id).order_by(Flashcard.created_at.desc()).all()

@app.delete("/flashcards/{flashcard_id}")
def delete_flashcard(flashcard_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = db.query(Flashcard).filter(Flashcard.id == flashcard_id, Flashcard.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
    db.delete(card); db.commit()
    return {"status": "deleted"}

# ── Quiz ──────────────────────────────────────────────────────────────────────

@app.post("/quiz/start", response_model=QuizCardOut)
def quiz_start(payload: QuizStartRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.flashcard_ids:
        cards = db.query(Flashcard).filter(Flashcard.id.in_(payload.flashcard_ids), Flashcard.user_id == current_user.id).all()
    else:
        all_cards = db.query(Flashcard).filter(Flashcard.user_id == current_user.id).all()
        if not all_cards:
            raise HTTPException(status_code=404, detail="No flashcards saved yet.")
        # Favor cards the user got wrong more often.
        weights = [max(1, c.wrong_count + 1) for c in all_cards]
        k       = min(payload.count, len(all_cards))
        cards   = random.choices(all_cards, weights=weights, k=k)
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
    return QuizCardOut(session_id=session.id, card_index=0, total_cards=len(cards), flashcard_id=cards[0].id, question=cards[0].question)

@app.post("/quiz/answer", response_model=AnswerResult)
def quiz_answer(payload: AnswerRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == payload.session_id, QuizSession.user_id == current_user.id).first()

    if not session: raise HTTPException(status_code=404, detail="Quiz session not found.")
    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index

    if idx >= len(card_ids): raise HTTPException(status_code=400, detail="Quiz already finished.")
    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    
    if not card: raise HTTPException(status_code=404, detail="Flashcard not found.")
    user_ans = payload.user_answer.strip().lower()
    correct_ans = card.answer.strip().lower()
    # Keep answer check forgiving for small wording differences.
    is_correct = user_ans == correct_ans or correct_ans in user_ans or user_ans in correct_ans

#correct_count and wrong_count are new and added to the quiz_answer function
    if is_correct: card.correct_count += 1; session.correct_count += 1
    else:          card.wrong_count   += 1; session.wrong_count   += 1

    session.current_index = idx + 1; db.commit()
    is_last = session.current_index >= len(card_ids)

    return AnswerResult(correct=is_correct, correct_answer=card.answer, user_answer=payload.user_answer, session_id=session.id, card_index=idx, total_cards=len(card_ids), is_last=is_last)

@app.get("/quiz/{session_id}/next", response_model=QuizCardOut)
def quiz_next(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id, QuizSession.user_id == current_user.id).first()

    if not session: raise HTTPException(status_code=404, detail="Quiz session not found.")
    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index

    if idx >= len(card_ids): raise HTTPException(status_code=400, detail="No more cards.")
    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()

    if not card: raise HTTPException(status_code=404, detail="Flashcard not found.")

    return QuizCardOut(session_id=session.id, card_index=idx, total_cards=len(card_ids), flashcard_id=card.id, question=card.question)
#The GET /quiz/{session_id}/summary endpoint calculates and returns the score_pct, correct_count, and wrong_count values.
@app.get("/quiz/{session_id}/summary", response_model=QuizSummary)
def quiz_summary(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(QuizSession).filter(QuizSession.id == session_id, QuizSession.user_id == current_user.id).first()

    if not session: raise HTTPException(status_code=404, detail="Quiz session not found.")
    total = len(session.flashcard_ids.split(","))
    answered = session.correct_count + session.wrong_count
    score_pct = round((session.correct_count / answered) * 100) if answered else 0
    
    return QuizSummary(session_id=session.id, total_cards=total, correct_count=session.correct_count, wrong_count=session.wrong_count, score_pct=score_pct)