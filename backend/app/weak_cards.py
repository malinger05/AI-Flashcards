"""
weak_cards.py — SCRUM-103
Rank flashcards the user struggles with (wrong/partial quiz attempts).
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .models import Flashcard, QuizAttempt

_VERDICT_WEIGHT = {"wrong": 3.0, "partial": 2.0, "correct": 0.0}


def rank_weak_cards(
    db: Session,
    user_id: int,
    *,
    limit: int = 10,
) -> list[dict]:
    """
    Return top weak cards for a user, newest mistakes weighted higher.
    Falls back to flashcards.wrong_count when no attempts exist yet.
    """
    limit = max(1, min(limit, 50))
    now = datetime.now(timezone.utc)

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )

    if attempts:
        by_card: dict[int, list[QuizAttempt]] = {}
        for a in attempts:
            by_card.setdefault(a.flashcard_id, []).append(a)

        scored: list[tuple[float, Flashcard, QuizAttempt]] = []
        card_ids = list(by_card.keys())
        cards = {
            c.id: c
            for c in db.query(Flashcard).filter(
                Flashcard.id.in_(card_ids),
                Flashcard.user_id == user_id,
            ).all()
        }

        for fid, rows in by_card.items():
            card = cards.get(fid)
            if not card:
                continue
            last = rows[0]
            if last.verdict == "correct":
                continue
            recent_wrong = sum(
                1 for r in rows[:5] if r.verdict in ("wrong", "partial")
            )
            days_ago = max(
                0.0,
                (now - _aware(last.created_at)).total_seconds() / 86400.0,
            )
            recency = max(0.1, 1.0 / (1.0 + days_ago))
            score = (
                _VERDICT_WEIGHT.get(last.verdict, 1.0) * 10
                + card.wrong_count * 2
                + recent_wrong * 3
            ) * recency
            scored.append((score, card, last))

        scored.sort(key=lambda x: x[0], reverse=True)
        out = []
        for score, card, last in scored[:limit]:
            out.append(_card_payload(card, last, score))
        return out

    # Fallback: cards with highest wrong_count (no attempt rows yet)
    cards = (
        db.query(Flashcard)
        .filter(Flashcard.user_id == user_id, Flashcard.wrong_count > 0)
        .order_by(Flashcard.wrong_count.desc(), Flashcard.id.desc())
        .limit(limit)
        .all()
    )
    return [
        _card_payload(c, None, float(c.wrong_count))
        for c in cards
    ]


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _card_payload(card: Flashcard, last: QuizAttempt | None, score: float) -> dict:
    return {
        "flashcard_id": card.id,
        "question": card.question,
        "answer": card.answer,
        "wrong_count": card.wrong_count,
        "last_verdict": last.verdict if last else None,
        "last_attempt_at": last.created_at if last else None,
        "grader_reason": (last.grader_reason or "") if last else "",
        "weakness_score": round(score, 2),
    }
