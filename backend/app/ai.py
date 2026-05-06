import json
import os
from urllib import error, request
from typing import Any


PROMPT_TEMPLATE = """You are a flashcard generator for students.
Return ONLY valid JSON with this exact shape — no markdown, no explanation, nothing else:
{
  "flashcards": [
    {
      "question": "string",
      "answer": "string" // should be concise, ideally one sentence, but can be up to 2 sentences if needed for clarity
    }
  ]
}

Rules:
- Generate between 8 and 12 flashcards based on the text.
- Questions must be clear, specific, and short (one sentence).
- Answers must be factual and concise (one or two sentences max).
- Cover the most important concepts in the text.
- No markdown inside question/answer strings.

Text to generate flashcards from:
{text}"""


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
        answer   = str(card.get("answer",   "")).strip()
        if question and answer:
            valid_cards.append({"question": question, "answer": answer})
    return valid_cards


def _extract_json(content: str) -> Any:
    content = content.strip()
    if not content:
        return {}

    # Strip markdown code fences if present
    if "```" in content:
        start = content.find("{")
        end   = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start: end + 1]

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # Fallback: find outermost { } braces
    start = content.find("{")
    end   = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(content[start: end + 1])
        except json.JSONDecodeError:
            pass

    return {}


def generate_flashcards(text: str) -> list[dict[str, str]]:
    ollama_base  = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ollama_model = os.getenv("OLLAMA_MODEL",    "llama3.2")

    prompt = PROMPT_TEMPLATE.replace("{text}", text)

    payload = {
        "model": ollama_model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a helpful assistant that ONLY outputs valid JSON. "
                    "Never include markdown, code fences, or any text outside the JSON object."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "format":  "json",
        "stream":  False,
        "options": {"temperature": 0.3, "num_predict": 2048},
    }

    try:
        req = request.Request(
            url=f"{ollama_base}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=120) as response:
            body = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, ValueError) as exc:
        raise RuntimeError(
            f"Could not reach Ollama at {ollama_base}. "
            f"Make sure Ollama is running and '{ollama_model}' is pulled. "
            f"Run: ollama pull {ollama_model}"
        ) from exc

    parsed_body = _extract_json(body)
    if not isinstance(parsed_body, dict):
        raise RuntimeError("Ollama returned an unexpected response format.")

    content = parsed_body.get("message", {}).get("content", "")
    if not content:
        raise RuntimeError("Ollama returned an empty response. Try with more detailed notes.")

    parsed = _extract_json(content)
    cards  = _coerce_flashcards(parsed)

    if not cards:
        raise RuntimeError(
            "AI response did not contain valid flashcards. "
            "Make sure your notes have enough content and try again."
        )

    return cards