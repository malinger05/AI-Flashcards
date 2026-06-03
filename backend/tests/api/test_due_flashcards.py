"""SCRUM-78 / SCRUM-80: spaced repetition API and due-card filtering."""

from datetime import datetime, timedelta, timezone

from app.models import Flashcard


def test_due_only_returns_cards_ready_for_review(client, auth_headers, auth_user, db_session):
    now = datetime.now(timezone.utc)
    due = Flashcard(
        user_id=auth_user.id,
        question="Due Q",
        answer="Due A",
        next_review_at=now - timedelta(hours=1),
    )
    later = Flashcard(
        user_id=auth_user.id,
        question="Later Q",
        answer="Later A",
        next_review_at=now + timedelta(days=5),
    )
    db_session.add_all([due, later])
    db_session.commit()

    res = client.get("/flashcards?due_only=true", headers=auth_headers)
    assert res.status_code == 200
    ids = {c["id"] for c in res.json()}
    assert due.id in ids
    assert later.id not in ids


def test_study_session_updates_next_review_at(client, auth_headers, auth_user, db_session):
    card = Flashcard(
        user_id=auth_user.id,
        question="Q",
        answer="A",
        next_review_at=None,
        review_step=0,
    )
    db_session.add(card)
    db_session.commit()

    res = client.post(
        "/study/session",
        headers=auth_headers,
        json={
            "correct": 1,
            "wrong": 0,
            "total": 1,
            "pct": 100,
            "flashcard_ids": [card.id],
            "results": [{"flashcard_id": card.id, "correct": True}],
        },
    )
    assert res.status_code == 200

    db_session.refresh(card)
    assert card.next_review_at is not None
    assert card.review_step == 1
