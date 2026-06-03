from unittest.mock import patch

from app.quiz_grader import grade_answer


def test_grade_answer_uses_ai_verdict():
    with patch(
        "app.quiz_grader._ollama_chat",
        return_value='{"verdict": "partial", "reason": "Missing detail"}',
    ):
        result = grade_answer("What is H2O?", "Water", "It's water")

    assert result == {
        "verdict": "partial",
        "reason": "Missing detail",
        "grader": "ai",
    }


def test_grade_answer_normalizes_unknown_ai_verdict():
    with patch(
        "app.quiz_grader._ollama_chat",
        return_value='{"verdict": "maybe", "reason": ""}',
    ):
        result = grade_answer("Q?", "Answer", "Guess")

    assert result["verdict"] == "wrong"
    assert result["grader"] == "ai"


def test_grade_answer_fuzzy_fallback_on_ai_failure():
    with patch("app.quiz_grader._ollama_chat", side_effect=RuntimeError("offline")):
        exact = grade_answer("Capital of France?", "Paris", "Paris")
        partial = grade_answer("Capital of France?", "Paris", "Par")
        wrong = grade_answer("Capital of France?", "Paris", "Berlin")

    assert exact["grader"] == "fuzzy_fallback"
    assert exact["verdict"] == "correct"
    assert partial["verdict"] == "partial"
    assert wrong["verdict"] == "wrong"
    assert "similarity" in exact["reason"].lower()
