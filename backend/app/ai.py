import json
import os
from urllib import error, request
from typing import Any


PROMPT_TEMPLATE = """
You are a flashcard generator for students.
Return ONLY valid JSON with this exact shape:
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string"
    }
  ]
}

Rules:
- Generate 5-10 flashcards based on the text.
- Questions must be clear and short.
- Answers must be factual and concise.
- No markdown, no extra text, no explanations outside JSON.

Text:
{text}
""".strip()


def _coerce_flashcards(data: Any) -> list[dict[str, str]]:
    if not isinstance(data, dict):
        return []
    cards = data.get("flashcards")
    if not isinstance(cards, list):
        return []

    valid_cards: list[dict[str, str]] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        question = str(card.get("question", "")).strip()
        answer = str(card.get("answer", "")).strip()
        if question and answer:
            valid_cards.append({"question": question, "answer": answer})
    return valid_cards


def _extract_json(content: str) -> Any:
    content = content.strip()
    if not content:
        return {}

    # Handle code-fenced responses: ```json ... ```
    if "```" in content:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start : end + 1]

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {}


def generate_flashcards(text: str) -> list[dict[str, str]]:
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")

    try:
        payload = {
                "model": ollama_model,
                "messages": [
                    {"role": "system", "content": "You create study flashcards from student notes."},
                    # Avoid str.format on JSON braces in the prompt template.
                    {"role": "user", "content": PROMPT_TEMPLATE.replace("{text}", text)},
                ],
                "stream": False,
                "options": {"temperature": 0.2},
            }
        req = request.Request(
            url=f"{ollama_base}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, ValueError):
        return []

    parsed_body = _extract_json(body)
    content = parsed_body.get("message", {}).get("content", "") if isinstance(parsed_body, dict) else ""
    parsed = _extract_json(content)
    return _coerce_flashcards(parsed)
