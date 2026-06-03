"""Unit tests for app.study_guide.generate_study_guide."""

from unittest.mock import patch

import pytest

from app.study_guide import generate_study_guide


def _weak(fid=1):
    return [{
        "flashcard_id": fid,
        "question": "Capital of France?",
        "answer": "Paris",
        "last_verdict": "wrong",
        "grader_reason": "Said London",
    }]


def test_generate_empty_weak_cards_skips_ollama():
    with patch("app.study_guide._ollama_chat") as mock_chat:
        result = generate_study_guide([])

    mock_chat.assert_not_called()
    assert "complete a quiz first" in result["summary"].lower()
    assert result["cards"] == []


def test_generate_parses_ollama_json():
    payload = (
        '{"summary":"Focus on Europe","cards":[{"flashcard_id":7,'
        '"tips":["Use a map","Group by region"],"mnemonic":"PAR"}]}'
    )
    with patch("app.study_guide._ollama_chat", return_value=payload):
        result = generate_study_guide(_weak(7))

    assert result["summary"] == "Focus on Europe"
    assert len(result["cards"]) == 1
    assert result["cards"][0]["flashcard_id"] == 7
    assert result["cards"][0]["tips"] == ["Use a map", "Group by region"]
    assert result["cards"][0]["mnemonic"] == "PAR"


def test_generate_default_summary_when_blank():
    with patch(
        "app.study_guide._ollama_chat",
        return_value='{"summary":"","cards":[{"flashcard_id":1,"tips":["t"],"mnemonic":""}]}',
    ):
        result = generate_study_guide(_weak(1))

    assert "Review the tips below" in result["summary"]


def test_generate_coerces_string_tips_to_list():
    with patch(
        "app.study_guide._ollama_chat",
        return_value='{"summary":"Ok","cards":[{"flashcard_id":1,"tips":"One tip only","mnemonic":""}]}',
    ):
        result = generate_study_guide(_weak(1))

    assert result["cards"][0]["tips"] == ["One tip only"]


def test_generate_skips_invalid_card_entries():
    with patch(
        "app.study_guide._ollama_chat",
        return_value='{"summary":"Ok","cards":["bad",{"flashcard_id":2,"tips":["ok"],"mnemonic":""}]}',
    ):
        result = generate_study_guide(_weak(2))

    assert len(result["cards"]) == 1
    assert result["cards"][0]["flashcard_id"] == 2


def test_generate_empty_mnemonic_becomes_none():
    with patch(
        "app.study_guide._ollama_chat",
        return_value='{"summary":"Ok","cards":[{"flashcard_id":1,"tips":["t"],"mnemonic":""}]}',
    ):
        result = generate_study_guide(_weak(1))

    assert result["cards"][0]["mnemonic"] is None


def test_generate_propagates_ollama_errors():
    with patch("app.study_guide._ollama_chat", side_effect=RuntimeError("offline")):
        with pytest.raises(RuntimeError, match="offline"):
            generate_study_guide(_weak())
