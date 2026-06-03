"""SCRUM-94: study history list and per-session card drill-down."""

from app.models import Flashcard


def test_study_history_lists_saved_sessions(client, auth_headers, auth_user, db_session):
    card = Flashcard(user_id=auth_user.id, question="Q", answer="A")
    db_session.add(card)
    db_session.commit()

    client.post(
        "/study/session",
        headers=auth_headers,
        json={
            "correct": 2,
            "wrong": 1,
            "total": 3,
            "pct": 67,
            "flashcard_ids": [card.id],
            "results": [{"flashcard_id": card.id, "correct": True}],
        },
    )

    res = client.get("/study/history", headers=auth_headers)
    assert res.status_code == 200
    history = res.json()
    assert len(history) >= 1
    assert history[0]["pct"] == 67

    session_id = history[0]["id"]
    cards_res = client.get(f"/study/history/{session_id}/cards", headers=auth_headers)
    assert cards_res.status_code == 200
    assert cards_res.json()[0]["question"] == "Q"
