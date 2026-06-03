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
{coverage_rules}

Text:
{text}"""

IMAGE_GENERATION_PROMPT_BASE = """You are looking at an image of handwritten or printed study notes.

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
{difficulty_line}
{coverage_rules}"""


DIFFICULTY_LINES: dict[str, str] = {
    "easy": (
        "DIFFICULTY: EASY — focus on basic definitions, key terms, and simple recall. "
        "Questions should be straightforward; answers can be brief."
    ),
    "medium": (
        "DIFFICULTY: MEDIUM — typical exam-level depth; balance recall with understanding."
    ),
    "hard": (
        "DIFFICULTY: HARD — require deeper understanding, application, or comparison; "
        "avoid trivial one-word answers."
    ),
}


def _normalize_difficulty(difficulty: str) -> str:
    d = (difficulty or "medium").lower()
    return d if d in DIFFICULTY_LINES else "medium"


def _coverage_rules(count: int) -> str:
    n = max(5, min(20, int(count)))
    return (
        f"- Generate exactly {n} flashcards (match this count when the source has enough material).\n"
        "- Cover the most important distinct concepts — do not generate near-duplicate cards.\n"
        "- Prefer depth (one clear concept per card) over breadth (vague overview cards)."
    )


def _build_text_prompt(text: str, count: int = 10, difficulty: str = "medium") -> str:
    diff = _normalize_difficulty(difficulty)
    return (
        GENERATION_PROMPT.replace("{coverage_rules}", _coverage_rules(count))
        .replace("{text}", text)
        + f"\n\n{DIFFICULTY_LINES[diff]}"
    )


def _build_image_prompt(count: int = 10, difficulty: str = "medium") -> str:
    diff = _normalize_difficulty(difficulty)
    return IMAGE_GENERATION_PROMPT_BASE.format(
        difficulty_line=DIFFICULTY_LINES[diff],
        coverage_rules=_coverage_rules(count),
    )


# ── Answer Checking ───────────────────────────────────────────────────────────

ANSWER_CHECK_SYSTEM = (
    "You are a precise quiz evaluator. "
    "You reward genuine understanding and correct facts. "
    "You are lenient about wording but strict about factual substance. "
    "You reply ONLY with a JSON object — no other text whatsoever."
)

ANSWER_CHECK_PROMPT = """Compare the student's answer to the correct answer and decide: correct, partial, or wrong.

Question:       {question}
Correct answer: {correct_answer}
Student answer: {user_answer}

━━━ WHAT TO CHECK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Identify the CORE FACTS of the correct answer.
  Ask: what are the 1-2 facts a student absolutely must know to answer this question?
  Everything else (examples, extra context, implementation details) is supporting detail.

STEP 2 — Check whether the student stated those core facts.
  - Synonyms, paraphrases, typos, grammar errors, informal phrasing → ignore completely.
  - SHORT does NOT mean PARTIAL. A brief answer that contains the core facts is CORRECT.
  - An answer is only PARTIAL if a CORE FACT is genuinely missing or wrong — not because
    supporting details, examples, or extra context are omitted.
  - An answer is WRONG if it is factually incorrect, completely off-topic, or so vague it
    could describe dozens of different things.

━━━ THE SHORT-ANSWER RULE (critical) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Students often write correct answers in very few words. Before marking PARTIAL, ask:
  "Does the student's answer, even if short, contain the core facts?"
  If YES → CORRECT, regardless of what extra details the model answer includes.
  If NO  → check whether a core fact is missing (PARTIAL) or nothing correct is stated (WRONG).

━━━ THREE VERDICTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORRECT — Student states the core facts, even briefly, even with different words or typos.

PARTIAL — Student is on the right topic and has SOME core facts but is genuinely missing
  ONE core fact, or has a notable factual error alongside correct parts.
  Do NOT use PARTIAL just because the answer is short or omits supporting details.

WRONG   — Core facts are absent, contradicted, or the answer is too vague to show knowledge
  of the specific topic (could describe many different things).

━━━ CALIBRATION EXAMPLES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What were the Nuremberg Laws?
Correct: Laws that took away the human rights of Jewish people in Germany, forcing them to wear the Star of David on their clothing.
Core facts: (1) laws/rules, (2) targeted Jewish people, (3) removed their rights.
Star of David = supporting detail, not a core fact.

"It a document that take away jewish rights"          → CORRECT  (core facts 1+2+3 all present; typos ignored)
"Laws that stripped Jewish people of their rights"    → CORRECT  (same substance, cleaner phrasing)
"Laws targeting Jewish people in Germany"             → CORRECT  (identifies group + legal mechanism)
"Anti-Jewish laws in Nazi Germany"                    → CORRECT  (brief but specific — group + legal nature)
"Laws about Jewish people wearing the Star of David"  → PARTIAL  (mentions Jews + a detail, but misses rights removal — a core fact)
"Nazi laws about clothing badges"                     → PARTIAL  (too narrow — misses rights-removal core)
"German laws during World War 2"                      → WRONG    (too vague — describes hundreds of possible laws)
"A peace treaty"                                      → WRONG    (factually wrong)

Q: What was the Enabling Act of 1933?
Correct: A law that gave Hitler dictatorial powers and effectively ended the Weimar Republic's democratic system.
Core facts: (1) a law, (2) gave Hitler dictatorial/total power.

"A law that gave Hitler total power over Germany"     → CORRECT  (core facts 1+2 present)
"It allowed Hitler to pass laws without parliament"   → CORRECT  (describes the mechanism of total power)
"A law that transformed Weimar Germany into Nazism"   → PARTIAL  (right context but does not name HOW — Hitler's dictatorial power)
"A law about enabling the Nazi party"                 → WRONG    (too vague, no specific claim about what it enabled)
"A peace treaty signed after WWI"                     → WRONG    (factually wrong)

Q: What is osmosis?
Correct: Movement of water molecules from low to high solute concentration through a semi-permeable membrane.
Core facts: (1) water movement, (2) concentration gradient direction (low to high solute).

"Water moving from dilute to concentrated solution across a membrane" → CORRECT  (core facts 1+2 present)
"Water moving through a membrane"                                     → WRONG    (no direction — too vague)
"Movement of particles from high to low concentration"                → PARTIAL  (direction inverted AND particles not water only)

Q: What was Hitler's goal for Germany?
Correct: Lebensraum — living space for the German people in Eastern Europe.
Core facts: (1) territorial expansion, (2) eastward / Eastern Europe direction.

"To expand German territory into Eastern Europe"      → CORRECT  (core facts 1+2 present)
"To expand Germany's territory"                       → PARTIAL  (core fact 1 present; Eastern Europe direction is a core fact here, not a detail)
"To make Germany great again"                         → WRONG    (too vague, no factual content)

━━━ REASON FIELD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For PARTIAL: name the specific CORE FACT that is missing or wrong (not a supporting detail).
For WRONG: state briefly why it fails (too vague / factually wrong / off-topic).
For CORRECT: return an empty string "".

Return ONLY this JSON:
{{
  "verdict": "correct" | "partial" | "wrong",
  "reason": "specific explanation — empty string if correct"
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
    # SCRUM-92: default quiz/generation model — override with OLLAMA_MODEL (e.g. llama3.2)
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

def generate_flashcards(
    text: str,
    count: int = 10,
    difficulty: str = "medium",
) -> list[dict[str, str]]:
    prompt = _build_text_prompt(text, count=count, difficulty=difficulty)
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


def generate_flashcards_from_image(
    image_bytes: bytes,
    media_type: str,
    count: int = 10,
    difficulty: str = "medium",
) -> list[dict[str, str]]:
    """
    Generate flashcards from an image (JPEG, PNG, WebP, GIF).
    Requires a vision-capable Ollama model (e.g. llava, llava-phi3, moondream).
    Set OLLAMA_VISION_MODEL env var to the model name (default: llava).
    """
    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    content = _ollama_vision_chat(
        image_b64=image_b64,
        media_type=media_type,
        prompt=_build_image_prompt(count=count, difficulty=difficulty),
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


def generate_flashcards_from_pdf(
    pdf_bytes: bytes,
    count: int = 10,
    difficulty: str = "medium",
) -> list[dict[str, str]]:
    """
    Extract text from a PDF and generate flashcards from it.
    Uses pypdf for text extraction; falls back to an error message for scanned PDFs.
    """
    text = _extract_text_from_pdf(pdf_bytes)
    # Trim to ~8000 chars to stay within context window
    if len(text) > 8000:
        text = text[:8000] + "\n\n[…text truncated for context window…]"
    return generate_flashcards(text, count=count, difficulty=difficulty)


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