import pytest
from pydantic import ValidationError

from app.schemas import (
    ChangePasswordRequest,
    FlashcardCreate,
    LoginRequest,
    QuizStartRequest,
    RegisterRequest,
)


def test_register_request_requires_minimum_password_length():
    with pytest.raises(ValidationError):
        RegisterRequest(name="Ada", email="ada@example.com", password="12345")

    req = RegisterRequest(name="Ada", email="ada@example.com", password="123456")
    assert req.email == "ada@example.com"


def test_login_request_requires_email_and_password():
    with pytest.raises(ValidationError):
        LoginRequest(email="ab", password="")

    req = LoginRequest(email="ada@example.com", password="secret")
    assert req.password == "secret"


def test_quiz_start_request_count_bounds():
    with pytest.raises(ValidationError):
        QuizStartRequest(count=0)

    with pytest.raises(ValidationError):
        QuizStartRequest(count=51)

    req = QuizStartRequest(count=10, flashcard_ids=[1, 2, 3])
    assert req.count == 10
    assert req.flashcard_ids == [1, 2, 3]


def test_flashcard_create_defaults_deck():
    card = FlashcardCreate(question="What is DNA?", answer="Genetic material.")
    assert card.deck == "General"


def test_change_password_request_minimum_length():
    with pytest.raises(ValidationError):
        ChangePasswordRequest(current_password="old", new_password="12345")

    req = ChangePasswordRequest(current_password="old", new_password="123456")
    assert req.new_password == "123456"
