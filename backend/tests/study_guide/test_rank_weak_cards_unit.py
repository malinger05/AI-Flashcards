"""Unit tests for app.weak_cards.rank_weak_cards."""

from datetime import datetime, timedelta, timezone

from app.models import Flashcard, QuizAttempt
from app.weak_cards import rank_weak_cards


def _card(db, user_id, q, a, wrong_count=0):
    card = Flashcard(question=q, answer=a, user_id=user_id, wrong_count=wrong_count)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def _attempt(db, user_id, card_id, verdict, *, hours_ago=0, reason=""):
    created = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    row = QuizAttempt(
        user_id=user_id,
        session_id=1,
        flashcard_id=card_id,
        verdict=verdict,
        user_answer="x",
        grader_reason=reason,
        grader="ai",
    )
    row.created_at = created
    db.add(row)
    db.commit()
    return row


def test_rank_empty_when_no_mistakes(db_session, auth_user):
    _card(db_session, auth_user.id, "Q1", "A1")
    assert rank_weak_cards(db_session, auth_user.id) == []


def test_rank_fallback_by_wrong_count_without_attempts(db_session, auth_user):
    high = _card(db_session, auth_user.id, "Hard", "Ans", wrong_count=5)
    _card(db_session, auth_user.id, "Easy", "Ans", wrong_count=0)

    rows = rank_weak_cards(db_session, auth_user.id, limit=5)

    assert len(rows) == 1
    assert rows[0]["flashcard_id"] == high.id
    assert rows[0]["last_verdict"] is None
    assert rows[0]["weakness_score"] == 5.0


def test_rank_prefers_wrong_over_partial(db_session, auth_user):
    wrong_card = _card(db_session, auth_user.id, "W", "A", wrong_count=1)
    partial_card = _card(db_session, auth_user.id, "P", "B", wrong_count=1)
    _attempt(db_session, auth_user.id, partial_card.id, "partial")
    _attempt(db_session, auth_user.id, wrong_card.id, "wrong")

    rows = rank_weak_cards(db_session, auth_user.id, limit=2)

    assert [r["flashcard_id"] for r in rows] == [wrong_card.id, partial_card.id]
    assert rows[0]["last_verdict"] == "wrong"
    assert rows[1]["last_verdict"] == "partial"


def test_rank_skips_card_when_latest_attempt_correct(db_session, auth_user):
    card = _card(db_session, auth_user.id, "Q", "A", wrong_count=2)
    _attempt(db_session, auth_user.id, card.id, "wrong", hours_ago=2)
    _attempt(db_session, auth_user.id, card.id, "correct", hours_ago=0)

    assert rank_weak_cards(db_session, auth_user.id) == []


def test_rank_respects_limit(db_session, auth_user):
    ids = []
    for i in range(3):
        c = _card(db_session, auth_user.id, f"Q{i}", f"A{i}", wrong_count=1)
        _attempt(db_session, auth_user.id, c.id, "wrong")
        ids.append(c.id)

    rows = rank_weak_cards(db_session, auth_user.id, limit=2)

    assert len(rows) == 2


def test_rank_includes_grader_reason_from_last_attempt(db_session, auth_user):
    card = _card(db_session, auth_user.id, "Q", "A")
    _attempt(db_session, auth_user.id, card.id, "partial", reason="Too vague")

    rows = rank_weak_cards(db_session, auth_user.id)

    assert rows[0]["grader_reason"] == "Too vague"
