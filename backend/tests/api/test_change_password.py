"""SCRUM-93: POST /auth/change-password for logged-in users."""

from app.auth import verify_password
from app.models import User


def test_change_password_success(client, auth_headers, auth_user, db_session):
    res = client.post(
        "/auth/change-password",
        headers=auth_headers,
        json={"current_password": "secret12", "new_password": "newpass9"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    db_session.refresh(auth_user)
    assert verify_password("newpass9", auth_user.password)
    assert not verify_password("secret12", auth_user.password)


def test_change_password_rejects_wrong_current(client, auth_headers):
    res = client.post(
        "/auth/change-password",
        headers=auth_headers,
        json={"current_password": "wrong", "new_password": "newpass9"},
    )
    assert res.status_code == 400
