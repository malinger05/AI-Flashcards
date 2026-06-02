import base64
import json
import os
from urllib import error, request
from typing import Any


# ── Flashcard Generation ──────────────────────────────────────────────────────

GENERATION_SYSTEM = (
    "You are an expert educational flashcard author. "
    "You ONLY output valid JSON — no markdown, no code fences, no commentary outside the JSON object."
)

GENERATION_PROMPT = """Create high-quality study flashcards from the text below.

Return ONLY this exact JSON shape (no markdown, no extra keys):
{{
  "flashcards": [
    {{
      "question": "string",
      "answer": "string"
    }}
  ]
}}

QUESTION rules — every question MUST:
1. Be self-contained: a student must be able to answer it without seeing the source text.
2. Test ONE concept (no compound "and/or" questions).
3. Use precise wording: "What is…", "How does…", "Why does…", "What causes…", "Define…", "What are the steps to…".
4. Be answerable with a short, factual response — never open-ended or opinion-based.
5. Never start with "This text…", "According to…", or "In the passage…".
6. Never be a fill-in-the-blank sentence with a blank ("_______").

ANSWER rules — every answer MUST:
1. Directly and completely answer the question in 1–3 sentences.
2. Be factual, specific, and self-contained.
3. Include the key term/concept even if it repeats the question slightly.
4. Use plain language — no markdown, no bullet points inside the answer string.

COVERAGE rules:
- Generate between 8 and 12 flashcards.
- Cover the most important distinct concepts — do not generate near-duplicate cards.
- Prefer depth (one clear concept per card) over breadth (vague overview cards).

Text:
{text}"""

IMAGE_GENERATION_PROMPT = """You are looking at an image of handwritten or printed study notes.

1. First, carefully read ALL text visible in the image.
2. Then create high-quality flashcards from the content.

Return ONLY this exact JSON shape (no markdown, no extra keys):
{{
  "flashcards": [
    {{
      "question": "string",
      "answer": "string"
    }}
  ]
}}

Apply the same question/answer rules as for text-based generation.
Generate between 5 and 12 flashcards covering the key concepts visible in the image."""


# ── Answer Checking ───────────────────────────────────────────────────────────

ANSWER_CHECK_SYSTEM = (
    "You are a strict but fair quiz evaluator for students. "
    "You reply ONLY with a JSON object — no other text whatsoever."
)

ANSWER_CHECK_PROMPT = """Evaluate whether the student's answer is correct.

Question: {question}
Correct answer: {correct_answer}
Student's answer: {user_answer}

Evaluation criteria (in order of importance):
1. CORE CONCEPT: Does the student's answer capture the essential meaning of the correct answer?
2. COMPLETENESS: For multi-part answers, does the student cover the main point (minor omissions are OK)?
3. ACCURACY: Is everything the student said factually correct? Partially wrong details matter.
4. WORDING: Synonyms, paraphrasing, abbreviations, and different sentence structure are all fine.
5. TYPOS / CASE: Ignore spelling mistakes and capitalisation differences.

Mark as CORRECT if:
- The student clearly knows the concept, even with different wording.
- The student's answer is a reasonable subset of the correct answer covering the key idea.
- Minor inaccuracies that do not change the core meaning.

Mark as PARTIAL if:
- The student shows partial understanding but misses a significant part of the correct answer.
- The answer is on the right track but contains a notable factual error.

Mark as WRONG if:
- The core concept is absent or contradicted.
- The answer is completely unrelated.
- The answer is so vague it provides no real information.

Return ONLY this JSON (no markdown, no explanation):
{{
  "verdict": "correct" | "partial" | "wrong",
  "reason": "one short sentence explaining why"
}}"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_json(content: str) -> Any:
    content = content.strip()
    if not content:
        return {}

    if "```" in content:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            content = content[start : end + 1]

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(content[start : end + 1])
        except json.JSONDecodeError:
            pass

    return {}


def _coerce_flashcards(data: Any) -> list[dict[str, str]]:
    if not isinstance(data, dict):
        return []
    cards = data.get("flashcards")
    if not isinstance(cards, list):
        return []

    seen_questions: set[str] = set()
    valid_cards: list[dict[str, str]] = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        question = str(card.get("question", "")).strip()
        answer = str(card.get("answer", "")).strip()
        if not question or not answer:
            continue
        if len(question) < 10 or len(answer) < 5:
            continue
        if "___" in question:
            continue
        key = question.lower()[:40]
        if key in seen_questions:
            continue
        seen_questions.add(key)
        valid_cards.append({"question": question, "answer": answer})
    return valid_cards


def _ollama_chat(
    messages: list[dict],
    *,
    fmt: str | None = "json",
    temperature: float = 0.3,
    timeout: int = 120,
) -> str:
    """Send a chat request to Ollama and return the assistant message content."""
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")

    payload: dict = {
        "model": ollama_model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature, "num_predict": 2048},
    }
    if fmt:
        payload["format"] = fmt

    try:
        req = request.Request(
            url=f"{ollama_base}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, ValueError) as exc:
        raise RuntimeError(
            f"Could not reach Ollama at {ollama_base}. "
            f"Make sure Ollama is running and the model is pulled."
        ) from exc

    parsed_body = _extract_json(body)
    content = parsed_body.get("message", {}).get("content", "")
    if not content:
        raise RuntimeError("Ollama returned an empty response.")
    return content


def _ollama_vision_chat(
    image_b64: str,
    media_type: str,
    prompt: str,
    *,
    timeout: int = 180,
) -> str:
    """
    Send an image to Ollama using a vision-capable model (llava, llava-phi3, etc.).
    Falls back gracefully if the configured model doesn't support vision.
    """
    ollama_base = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    # Use a dedicated vision model if configured; fall back to the default model
    vision_model = os.getenv("OLLAMA_VISION_MODEL", os.getenv("OLLAMA_MODEL", "llava"))

    payload: dict = {
        "model": vision_model,
        "messages": [
            {
                "role": "user",
                "content": prompt,
                "images": [image_b64],
            }
        ],
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 3000},
        "format": "json",
    }

    try:
        req = request.Request(
            url=f"{ollama_base}/api/chat",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
    except (error.URLError, TimeoutError, ValueError) as exc:
        raise RuntimeError(
            f"Could not reach Ollama vision model '{vision_model}' at {ollama_base}. "
            "Pull a vision model with: ollama pull llava"
        ) from exc

    parsed_body = _extract_json(body)
    content = parsed_body.get("message", {}).get("content", "")
    if not content:
        raise RuntimeError("Ollama vision model returned an empty response.")
    return content


def _extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF using pypdf (pure Python, no system deps).
    Returns extracted text, or raises RuntimeError if extraction fails.
    """
    try:
        import io
        from pypdf import PdfReader  # type: ignore
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                pages.append(text.strip())
        combined = "\n\n".join(pages)
        if not combined.strip():
            raise RuntimeError("PDF appears to contain no extractable text (it may be scanned). Try an image instead.")
        return combined
    except ImportError:
        raise RuntimeError(
            "pypdf is not installed. Run: pip install pypdf"
        )
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"Failed to read PDF: {exc}") from exc


# ── Public API ────────────────────────────────────────────────────────────────

def generate_flashcards(text: str) -> list[dict[str, str]]:
    prompt = GENERATION_PROMPT.replace("{text}", text)
    content = _ollama_chat(
        [
            {"role": "system", "content": GENERATION_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        fmt="json",
        temperature=0.3,
    )
    parsed = _extract_json(content)
    cards = _coerce_flashcards(parsed)
    if not cards:
        raise RuntimeError(
            "AI did not return valid flashcards. "
            "Try adding more detailed notes and try again."
        )
    return cards


def generate_flashcards_from_image(image_bytes: bytes, media_type: str) -> list[dict[str, str]]:
    """
    Generate flashcards from an image (JPEG, PNG, WebP, GIF).
    Requires a vision-capable Ollama model (e.g. llava, llava-phi3, moondream).
    Set OLLAMA_VISION_MODEL env var to the model name (default: llava).
    """
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    content = _ollama_vision_chat(
        image_b64=image_b64,
        media_type=media_type,
        prompt=IMAGE_GENERATION_PROMPT,
        timeout=180,
    )
    parsed = _extract_json(content)
    cards = _coerce_flashcards(parsed)
    if not cards:
        raise RuntimeError(
            "Could not extract flashcards from the image. "
            "Try a clearer photo, or paste the text directly."
        )
    return cards


def generate_flashcards_from_pdf(pdf_bytes: bytes) -> list[dict[str, str]]:
    """
    Extract text from a PDF and generate flashcards from it.
    Uses pypdf for text extraction; falls back to an error message for scanned PDFs.
    """
    text = _extract_text_from_pdf(pdf_bytes)
    # Trim to ~8000 chars to stay within context window
    if len(text) > 8000:
        text = text[:8000] + "\n\n[…text truncated for context window…]"
    return generate_flashcards(text)


def check_answer(question: str, correct_answer: str, user_answer: str) -> dict:
    """
    Returns {"verdict": "correct"|"partial"|"wrong", "reason": str}.
    Falls back to fuzzy string similarity if Ollama is unreachable.
    """
    prompt = (
        ANSWER_CHECK_PROMPT
        .replace("{question}", question)
        .replace("{correct_answer}", correct_answer)
        .replace("{user_answer}", user_answer)
    )
    try:
        content = _ollama_chat(
            [
                {"role": "system", "content": ANSWER_CHECK_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            fmt="json",
            temperature=0.0,
            timeout=30,
        )
        result = _extract_json(content)
        verdict = str(result.get("verdict", "")).lower().strip()
        reason = str(result.get("reason", "")).strip()
        if verdict not in ("correct", "partial", "wrong"):
            verdict = "wrong"
        return {"verdict": verdict, "reason": reason}
    except Exception:
        from difflib import SequenceMatcher
        ratio = SequenceMatcher(
            None,
            user_answer.strip().lower(),
            correct_answer.strip().lower(),
        ).ratio()
        if ratio >= 0.80:
            verdict = "correct"
        elif ratio >= 0.45:
            verdict = "partial"
        else:
            verdict = "wrong"
        return {"verdict": verdict, "reason": "Evaluated by text similarity (AI unavailable)."}