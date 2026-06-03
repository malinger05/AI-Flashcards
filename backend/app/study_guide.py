"""
study_guide.py — SCRUM-104
Ollama-powered study tips for cards the user gets wrong on quizzes.
"""

import json
import logging
import time
from typing import Any

from .ai import _extract_json, _ollama_chat

logger = logging.getLogger("flashcards.study_guide")

STUDY_GUIDE_SYSTEM = (
    "You are a supportive tutor. Given flashcards a student missed on quizzes, "
    "return concise JSON study tips — no markdown, no extra keys."
)

STUDY_GUIDE_PROMPT = """The student struggled with these flashcards. For each card, give 2-3 short study tips and an optional mnemonic.

Cards (JSON array):
{cards_json}

Return ONLY valid JSON:
{{
  "summary": "One encouraging sentence about what to focus on",
  "cards": [
    {{
      "flashcard_id": <number>,
      "tips": ["tip1", "tip2"],
      "mnemonic": "optional memory hook or empty string"
    }}
  ]
}}
"""


def generate_study_guide(weak_cards: list[dict]) -> dict[str, Any]:
    """
    Call Ollama to produce study tips for weak_cards payloads from rank_weak_cards.
    """
    if not weak_cards:
        return {"summary": "No weak areas identified yet — complete a quiz first.", "cards": []}

    slim = []
    for c in weak_cards:
        slim.append({
            "flashcard_id": c["flashcard_id"],
            "question": c["question"],
            "correct_answer": c["answer"],
            "last_verdict": c.get("last_verdict"),
            "why_missed": (c.get("grader_reason") or "")[:300],
        })

    prompt = STUDY_GUIDE_PROMPT.replace(
        "{cards_json}", json.dumps(slim, ensure_ascii=False)
    )
    t0 = time.perf_counter()
    try:
        content = _ollama_chat(
            [
                {"role": "system", "content": STUDY_GUIDE_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            fmt="json",
            temperature=0.4,
            timeout=90,
        )
        parsed = _extract_json(content)
        summary = str(parsed.get("summary", "")).strip()
        cards_raw = parsed.get("cards", [])
        if not isinstance(cards_raw, list):
            cards_raw = []

        tips_out = []
        for item in cards_raw:
            if not isinstance(item, dict):
                continue
            fid = item.get("flashcard_id")
            if fid is None:
                continue
            tips = item.get("tips", [])
            if isinstance(tips, str):
                tips = [tips]
            tips = [str(t).strip() for t in tips if str(t).strip()][:5]
            mnemonic = str(item.get("mnemonic", "") or "").strip()
            tips_out.append({
                "flashcard_id": int(fid),
                "tips": tips,
                "mnemonic": mnemonic or None,
            })

        duration_ms = round((time.perf_counter() - t0) * 1000)
        logger.info(
            "study_guide_ok card_count=%d duration_ms=%d",
            len(tips_out), duration_ms,
        )
        return {"summary": summary or "Review the tips below before your next quiz.", "cards": tips_out}

    except Exception as exc:
        duration_ms = round((time.perf_counter() - t0) * 1000)
        logger.error(
            "study_guide_fail card_count=%d duration_ms=%d error=%s",
            len(weak_cards), duration_ms, type(exc).__name__,
        )
        raise
