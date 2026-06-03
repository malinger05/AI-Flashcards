from app.ai import _coerce_flashcards, _extract_json


def test_extract_json_plain_object():
    assert _extract_json('{"verdict": "correct"}') == {"verdict": "correct"}


def test_extract_json_strips_markdown_fence():
    raw = 'Here is the result:\n```json\n{"verdict": "partial", "reason": "close"}\n```'
    assert _extract_json(raw) == {"verdict": "partial", "reason": "close"}


def test_extract_json_embedded_object():
    raw = 'Answer: {"flashcards": [{"question": "Q?", "answer": "A."}]} trailing text'
    assert _extract_json(raw)["flashcards"][0]["question"] == "Q?"


def test_extract_json_empty_or_invalid():
    assert _extract_json("") == {}
    assert _extract_json("not json at all") == {}


def test_coerce_flashcards_filters_invalid_entries():
    data = {
        "flashcards": [
            {"question": "What is photosynthesis?", "answer": "Process plants use."},
            {"question": "short", "answer": "x"},
            {"question": "Fill in the blank: ___", "answer": "valid answer"},
            {"question": "What is gravity?", "answer": "Force of attraction."},
            {"question": "What is gravity?", "answer": "Duplicate question."},
            "not a dict",
        ]
    }

    cards = _coerce_flashcards(data)

    assert len(cards) == 2
    assert cards[0]["question"] == "What is photosynthesis?"
    assert cards[1]["question"] == "What is gravity?"


def test_coerce_flashcards_non_dict_input():
    assert _coerce_flashcards([]) == []
    assert _coerce_flashcards({"flashcards": "nope"}) == []
