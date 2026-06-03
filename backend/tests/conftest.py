"""Shared pytest fixtures — in-memory SQLite, auth helper, API client."""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

from app.auth import generate_token, hash_password  # noqa: E402
from app.db import Base, get_db, run_migrations  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User, UserSession  # noqa: E402


@pytest.fixture()
def db_engine(monkeypatch):
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    from app import db as db_module

    monkeypatch.setattr(db_module, "engine", engine)
    monkeypatch.setattr(db_module, "SessionLocal", sessionmaker(autocommit=False, autoflush=False, bind=engine))
    Base.metadata.create_all(bind=engine)
    run_migrations()
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_user(db_session):
    user = User(
        name="Test User",
        email="tester@example.com",
        password=hash_password("secret12"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def auth_headers(auth_user, db_session):
    token = generate_token(auth_user.id)
    db_session.add(UserSession(token=token, user_id=auth_user.id))
    db_session.commit()
    return {"Authorization": f"Bearer {token}"}
