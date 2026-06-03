"""SCRUM-108: study guide, weak cards, remediation quiz, quiz attempts."""

from unittest.mock import patch

from app.models import Flashcard, QuizAttempt, QuizSession


def _save_card(db, user_id, q="Q?", a="A"):
    card = Flashcard(question=q, answer=a, user_id=user_id)
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def test_quiz_answer_persists_attempt(client, auth_headers, db_session, auth_user):
    card = _save_card(db_session, auth_user.id, "Capital?", "Paris")
    start = client.post(
        "/quiz/start",
        json={"flashcard_ids": [card.id], "count": 1},
        headers=auth_headers,
    )
    sid = start.json()["session_id"]

    with patch(
        "app.quiz_grader._ollama_chat",
        return_value='{"verdict":"wrong","reason":"missed"}',
    ):
        client.post(
            "/quiz/answer",
            json={"session_id": sid, "user_answer": "London"},
            headers=auth_headers,
        )

    attempts = (
        db_session.query(QuizAttempt)
        .filter(QuizAttempt.user_id == auth_user.id)
        .all()
    )
    assert len(attempts) == 1
    assert attempts[0].verdict == "wrong"
    assert attempts[0].flashcard_id == card.id


def test_weak_cards_empty_without_mistakes(client, auth_headers, db_session, auth_user):
    _save_card(db_session, auth_user.id)
    res = client.get("/study-guide/weak-cards", headers=auth_headers)
    assert res.status_code == 200
    assert res.json() == []


def test_weak_cards_ranks_after_wrong_attempt(client, auth_headers, db_session, auth_user):
    card = _save_card(db_session, auth_user.id)
    card.wrong_count = 2
    db_session.add(
        QuizAttempt(
            user_id=auth_user.id,
            session_id=1,
            flashcard_id=card.id,
            verdict="wrong",
            user_answer="x",
            grader_reason="off",
            grader="ai",
        )
    )
    db_session.commit()

    res = client.get("/study-guide/weak-cards?limit=5", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["flashcard_id"] == card.id
    assert data[0]["last_verdict"] == "wrong"


def test_study_guide_mock_ollama(client, auth_headers, db_session, auth_user):
    card = _save_card(db_session, auth_user.id)
    db_session.add(
        QuizAttempt(
            user_id=auth_user.id,
            session_id=1,
            flashcard_id=card.id,
            verdict="partial",
            user_answer="p",
            grader_reason="incomplete",
            grader="ai",
        )
    )
    db_session.commit()

    mock_json = (
        '{"summary":"Focus on capitals","cards":[{"flashcard_id":'
        + str(card.id)
        + ',"tips":["Review Europe"],"mnemonic":"PAR"}]}'
    )
    with patch("app.study_guide._ollama_chat", return_value=mock_json):
        res = client.post("/study-guide", json={"limit": 5}, headers=auth_headers)

    assert res.status_code == 200
    body = res.json()
    assert "Focus" in body["summary"]
    assert body["cards"][0]["flashcard_id"] == card.id
    assert body["cards"][0]["tips"]


def test_start_remediation_quiz(client, auth_headers, db_session, auth_user):
    card = _save_card(db_session, auth_user.id)
    card.wrong_count = 1
    db_session.add(
        QuizAttempt(
            user_id=auth_user.id,
            session_id=1,
            flashcard_id=card.id,
            verdict="wrong",
            user_answer="z",
            grader_reason="no",
            grader="fuzzy_fallback",
        )
    )
    db_session.commit()

    res = client.post(
        "/quiz/start-remediation", json={"limit": 10}, headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["session_id"] > 0
    assert data["flashcard_id"] == card.id

    session = db_session.get(QuizSession, data["session_id"])
    assert str(card.id) in session.flashcard_ids


def test_start_remediation_no_weak_cards(client, auth_headers, db_session, auth_user):
    _save_card(db_session, auth_user.id)
    res = client.post(
        "/quiz/start-remediation", json={"limit": 10}, headers=auth_headers
    )
    assert res.status_code == 400
