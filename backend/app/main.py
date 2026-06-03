"""
main.py — FlashCards AI backend
Implements:
  S3-001  logging_config wired at startup
  S3-002  HTTP request logging middleware (method, path, status, duration, user_id, X-Request-ID)
  S3-003  Auth event logging (masked email, never tokens/passwords)
  S3-004  /generate logging (text_len, card_count, duration_ms, model)
  S3-005  quiz_grader.py used for answer grading with telemetry
  S3-006  /health reports db + ollama status
  BL-006  Session expiry (last_used_at updated; SESSION_MAX_AGE_DAYS respected)
  BL-007  Rate limiting on POST /generate (in-memory, per user)
  BL-008  POST /auth/change-password
  BL-004  GET /quiz/history
"""

import json
import logging
import os
import random
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from urllib import error as urllib_error
from urllib import request as urllib_request

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, Response, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from .ai import (
    generate_flashcards,
    generate_flashcards_from_image,
    generate_flashcards_from_pdf,
)
from .auth import generate_token, hash_password, verify_password
from .db import Base, engine, get_db, run_migrations
from .logging_config import setup_logging
from .models import (
    Deck, DeckCard,
    Flashcard, QuizSession, User, UserSession,
    StudySession, StudySessionResult,
)
from .quiz_grader import grade_answer
from .spaced_repetition import compute_next_review, is_card_due
from .schemas import (
    AnswerRequest, AnswerResult, AuthResponse,
    ChangePasswordRequest,
    DeckAddCards, DeckCreate, DeckOut,
    FlashcardCreate, FlashcardOut, FlashcardUpdate, GenerateRequest,
    LoginRequest, QuizCardOut, QuizHistoryOut, QuizStartRequest,
    QuizSummary, RegisterRequest, UserOut,
    StudySessionCreate, StudySessionOut,
    StudySessionResultOut,
)
from .utils import mask_email

logger = logging.getLogger("flashcards.api")

# ── Rate-limit store (in-memory, per user, per hour) ─────────────────────────
# { user_id: [(timestamp, ...), ...] }
_rate_store: dict[int, list[float]] = defaultdict(list)
GENERATE_RATE_LIMIT = int(os.getenv("GENERATE_RATE_LIMIT", "20"))


def _check_rate_limit(user_id: int) -> None:
    now = time.time()
    window = 3600.0  # 1 hour
    calls = [t for t in _rate_store[user_id] if now - t < window]
    _rate_store[user_id] = calls
    if len(calls) >= GENERATE_RATE_LIMIT:
        logger.warning(
            "rate_limit_hit user_id=%d limit=%d window=1h",
            user_id, GENERATE_RATE_LIMIT,
        )
        raise HTTPException(
            status_code=429,
            detail=(
                f"You have reached the generate limit of {GENERATE_RATE_LIMIT} "
                "requests per hour. Please wait before trying again."
            ),
        )
    _rate_store[user_id].append(now)


# ── Session expiry ────────────────────────────────────────────────────────────
# SCRUM-91: idle timeout — compare last_used_at against this window (days).
# Set SESSION_MAX_AGE_DAYS=0 to disable expiry (useful for local dev).
SESSION_MAX_AGE_DAYS = int(os.getenv("SESSION_MAX_AGE_DAYS", "30"))


# ── App & middleware ──────────────────────────────────────────────────────────

app = FastAPI(title="AI Flashcard Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


class RequestLogMiddleware(BaseHTTPMiddleware):
    """
    S3-002: Log every request with method, path, status_code, duration_ms,
    request_id, and user_id. /health is logged at DEBUG only.
    5xx responses are logged at ERROR.

    SCRUM-63: manual check — trigger any API route and grep logs for api_request lines
    with matching X-Request-ID response header.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        t0 = time.perf_counter()

        # Peek at the auth header to resolve user_id for the log line.
        # We do a lightweight lookup — no exception raised here if invalid.
        user_id = "anonymous"
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            # Use a fresh DB session just for the lookup
            db: Session = next(get_db())
            try:
                session_row = db.query(UserSession).filter(
                    UserSession.token == token
                ).first()
                if session_row:
                    user_id = str(session_row.user_id)
            finally:
                db.close()

        response: Response = await call_next(request)
        duration_ms = round((time.perf_counter() - t0) * 1000)
        response.headers["X-Request-ID"] = request_id

        log_line = (
            "request method=%s path=%s status=%d duration_ms=%d "
            "request_id=%s user_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
            user_id,
        )

        if request.url.path == "/health":
            logger.debug(*log_line)
        elif response.status_code >= 500:
            logger.error(*log_line)
        else:
            logger.info(*log_line)

        return response


app.add_middleware(RequestLogMiddleware)


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    setup_logging()          # S3-001 / SCRUM-63: logging wired before any route traffic
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

    # SCRUM-91 / BL-006: enforce session max age from last_used_at
    if SESSION_MAX_AGE_DAYS > 0 and session.last_used_at:
        cutoff = datetime.now(timezone.utc) - timedelta(days=SESSION_MAX_AGE_DAYS)
        last = session.last_used_at
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        if last < cutoff:
            db.delete(session)
            db.commit()
            raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    # SCRUM-91: slide the session window forward on every authenticated request
    session.last_used_at = datetime.now(timezone.utc)
    db.commit()

    user = db.query(User).filter(User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    S3-006: Report database and Ollama reachability.
    Response: { status: "ok"|"degraded"|"error", db: "ok"|"error", ollama: "ok"|"unreachable" }
    HTTP 200 for ok/degraded, 503 for error.

    SCRUM-63: manual check — curl /health with Ollama up (ok) and stopped (degraded).
    """
    # DB probe
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
        logger.error("health_check db_probe=error")

    # Ollama probe (short 2 s timeout)
    ollama_status = "ok"
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    try:
        urllib_request.urlopen(f"{ollama_base}/api/tags", timeout=2)
    except Exception:
        ollama_status = "unreachable"
        logger.warning("health_check ollama_probe=unreachable base_url=%s", ollama_base)

    if db_status == "error":
        overall = "error"
    elif ollama_status == "unreachable":
        overall = "degraded"
    else:
        overall = "ok"

    payload = {"status": overall, "db": db_status, "ollama": ollama_status}
    status_code = 503 if overall == "error" else 200
    return JSONResponse(content=payload, status_code=status_code)


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        # S3-003: WARN on duplicate register — masked email, no password
        logger.warning("register_dup email=%s", mask_email(email))
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(name=payload.name.strip(), email=email, password=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    token = generate_token(user.id)
    db.add(UserSession(token=token, user_id=user.id)); db.commit()
    # S3-003: INFO on success — masked email, user_id, never token
    logger.info("register_ok user_id=%d email=%s", user.id, mask_email(email))
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user  = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(payload.password, user.password):
        # S3-003: WARN on failed login — masked email, never password
        logger.warning("login_fail email=%s", mask_email(email))
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = generate_token(user.id)
    db.add(UserSession(token=token, user_id=user.id)); db.commit()
    # S3-003: INFO on success
    logger.info("login_ok user_id=%d email=%s", user.id, mask_email(email))
    return AuthResponse(token=token, user=UserOut.model_validate(user))


@app.post("/auth/logout")
def logout(authorization: str = Header(...), db: Session = Depends(get_db)):
    if authorization.startswith("Bearer "):
        token = authorization[7:]
        session = db.query(UserSession).filter(UserSession.token == token).first()
        if session:
            user_id = session.user_id
            db.delete(session); db.commit()
            logger.info("logout_ok user_id=%d", user_id)
    return {"status": "ok"}


@app.get("/auth/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    BL-008 / SCRUM-93: Change password for the logged-in user.
    Verifies current_password, enforces min length on new_password, logs outcome (never passwords).
    """
    if not verify_password(payload.current_password, current_user.password):
        logger.warning("change_password_fail user_id=%d reason=wrong_current", current_user.id)
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    current_user.password = hash_password(payload.new_password)
    db.commit()
    logger.info("change_password_ok user_id=%d", current_user.id)
    return {"status": "ok"}


# ── Generate ──────────────────────────────────────────────────────────────────

@app.post("/generate")
def generate(
    payload: GenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # BL-007: rate limit
    _check_rate_limit(current_user.id)

    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    text_len = len(payload.text)
    # S3-004: log input size, not full text
    logger.info("generate_start user_id=%d text_len=%d", current_user.id, text_len)
    t0 = time.perf_counter()

    try:
        flashcards = generate_flashcards(payload.text)
    except RuntimeError as exc:
        duration_ms = round((time.perf_counter() - t0) * 1000)
        logger.error(
            "generate_fail user_id=%d error=%s duration_ms=%d",
            current_user.id, str(exc), duration_ms,
        )
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        duration_ms = round((time.perf_counter() - t0) * 1000)
        logger.error(
            "generate_fail user_id=%d error=%s duration_ms=%d",
            current_user.id, str(exc), duration_ms,
        )
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    duration_ms = round((time.perf_counter() - t0) * 1000)
    # S3-004: log success with card count, duration, model
    logger.info(
        "generate_ok user_id=%d cards=%d duration_ms=%d model=%s",
        current_user.id, len(flashcards), duration_ms, model,
    )
    return {"flashcards": flashcards}


@app.post("/generate/file")
async def generate_from_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # BL-007: rate limit (file uploads count against same limit)
    _check_rate_limit(current_user.id)

    MAX_SIZE = 10 * 1024 * 1024  # 10 MB
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()

    is_pdf   = content_type == "application/pdf" or filename.endswith(".pdf")
    is_image = content_type.startswith("image/") or any(
        filename.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")
    )

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload a PDF or image (JPEG, PNG, WebP).",
        )

    file_type = "pdf" if is_pdf else "image"
    logger.info(
        "generate_file_start user_id=%d file_type=%s size_bytes=%d",
        current_user.id, file_type, len(content),
    )
    t0 = time.perf_counter()

    try:
        if is_pdf:
            flashcards = generate_flashcards_from_pdf(content)
        else:
            media_type = content_type if content_type.startswith("image/") else "image/jpeg"
            flashcards = generate_flashcards_from_image(content, media_type)
    except RuntimeError as exc:
        duration_ms = round((time.perf_counter() - t0) * 1000)
        logger.error(
            "generate_file_fail user_id=%d file_type=%s error=%s duration_ms=%d",
            current_user.id, file_type, str(exc), duration_ms,
        )
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        duration_ms = round((time.perf_counter() - t0) * 1000)
        logger.error(
            "generate_file_fail user_id=%d file_type=%s error=%s duration_ms=%d",
            current_user.id, file_type, str(exc), duration_ms,
        )
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}")

    duration_ms = round((time.perf_counter() - t0) * 1000)
    logger.info(
        "generate_file_ok user_id=%d file_type=%s cards=%d duration_ms=%d",
        current_user.id, file_type, len(flashcards), duration_ms,
    )
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
def get_flashcards(
    deck: str | None = Query(default=None, description="Filter by deck name"),
    due_only: bool = Query(default=False, description="SCRUM-80: return only due cards"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """BL-002: optional ?deck= filter; ?due_only=true returns cards ready for review."""
    q = db.query(Flashcard).filter(Flashcard.user_id == current_user.id)
    if deck is not None:
        q = q.filter(Flashcard.deck == deck)
    cards = q.order_by(Flashcard.created_at.desc()).all()
    if due_only:
        # SCRUM-78/80: spaced repetition queue — next_review_at null or in the past
        cards = [c for c in cards if is_card_due(c.next_review_at)]
    return cards


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
    if payload.deck is not None:
        card.deck = payload.deck.strip() or "General"
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
            card = db.query(Flashcard).filter(
                Flashcard.id == card_id, Flashcard.user_id == current_user.id
            ).first()
            if card:
                db.add(DeckCard(deck_id=deck_id, flashcard_id=card_id))
    db.commit()
    return {"status": "ok"}

@app.delete("/decks/{deck_id}/cards/{flashcard_id}")
def remove_card_from_deck(
    deck_id: int, flashcard_id: int,
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
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index
    if idx >= len(card_ids):
        raise HTTPException(status_code=400, detail="Quiz already finished.")
    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")

    # SCRUM-92 / S3-005: llama3.2 semantic grading via quiz_grader (fuzzy_fallback if Ollama down)
    result    = grade_answer(card.question, card.answer, payload.user_answer)
    verdict   = result["verdict"]
    reason    = result["reason"]
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
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    card_ids = [int(x) for x in session.flashcard_ids.split(",")]
    idx = session.current_index
    if idx >= len(card_ids):
        raise HTTPException(status_code=400, detail="No more cards.")
    card = db.query(Flashcard).filter(Flashcard.id == card_ids[idx]).first()
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found.")
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
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
    total    = len(session.flashcard_ids.split(","))
    answered = session.correct_count + session.wrong_count
    score_pct = round((session.correct_count / answered) * 100) if answered else 0
    return QuizSummary(
        session_id=session.id, total_cards=total,
        correct_count=session.correct_count, wrong_count=session.wrong_count, score_pct=score_pct,
    )


@app.get("/quiz/history", response_model=list[QuizHistoryOut])
def get_quiz_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """BL-004: Return the last 50 quiz sessions for the current user, newest first."""
    sessions = (
        db.query(QuizSession)
        .filter(QuizSession.user_id == current_user.id)
        .order_by(QuizSession.created_at.desc())
        .limit(50)
        .all()
    )
    result = []
    for s in sessions:
        total    = len(s.flashcard_ids.split(",")) if s.flashcard_ids else 0
        answered = s.correct_count + s.wrong_count
        score_pct = round((s.correct_count / answered) * 100) if answered else 0
        result.append(QuizHistoryOut(
            id=s.id,
            created_at=s.created_at,
            total=total,
            correct=s.correct_count,
            wrong=s.wrong_count,
            score_pct=score_pct,
        ))
    return result


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
    now = datetime.now(timezone.utc)
    for r in payload.results:
        fid = r.get("flashcard_id") or r.get("id")
        if fid is None:
            continue
        knew_it = bool(r.get("correct"))
        db.add(StudySessionResult(
            study_session_id=session.id,
            flashcard_id=fid,
            correct=1 if knew_it else 0,
        ))
        # SCRUM-78: reschedule each studied card based on swipe outcome
        card = db.query(Flashcard).filter(
            Flashcard.id == fid,
            Flashcard.user_id == current_user.id,
        ).first()
        if card:
            nxt, step = compute_next_review(
                knew_it=knew_it,
                review_step=card.review_step or 0,
                now=now,
            )
            card.next_review_at = nxt
            card.review_step = step
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