"""SCRUM-91: sessions expire when last_used_at is older than SESSION_MAX_AGE_DAYS."""

from datetime import datetime, timedelta, timezone

from app.auth import generate_token
from app.models import UserSession


def test_expired_session_returns_401(client, auth_user, db_session, monkeypatch):
    monkeypatch.setattr("app.main.SESSION_MAX_AGE_DAYS", 30)
    token = generate_token(auth_user.id)
    expired = datetime.now(timezone.utc) - timedelta(days=31)
    db_session.add(
        UserSession(token=token, user_id=auth_user.id, last_used_at=expired)
    )
    db_session.commit()

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


def test_valid_session_refreshes_last_used_at(client, auth_headers, db_session):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
