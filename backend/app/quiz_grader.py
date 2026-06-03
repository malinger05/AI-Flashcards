"""
quiz_grader.py — S3-005
Extracted quiz answer-grading module.
Logs grader=ai or grader=fuzzy_fallback, duration_ms, and correct per answer.
Never logs the full student answer at INFO level.
"""

import logging
import time
from difflib import SequenceMatcher

from .ai import (
    ANSWER_CHECK_SYSTEM,
    ANSWER_CHECK_PROMPT,
    _ollama_chat,
    _extract_json,
)

logger = logging.getLogger("flashcards.quiz_grader")


def grade_answer(question: str, correct_answer: str, user_answer: str) -> dict:
    """
    Grade a student answer against the correct answer.

    Returns
    -------
    dict with keys:
        verdict  : "correct" | "partial" | "wrong"
        reason   : str  (explanation, empty string for correct)
        grader   : "ai" | "fuzzy_fallback"
    """
    t0 = time.perf_counter()
    grader = "ai"
    verdict = "wrong"
    reason = ""

    try:
        prompt = (
            ANSWER_CHECK_PROMPT
            .replace("{question}", question)
            .replace("{correct_answer}", correct_answer)
            .replace("{user_answer}", user_answer)
        )
        content = _ollama_chat(
            [
                {"role": "system", "content": ANSWER_CHECK_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            fmt="json",
            temperature=0.0,
            timeout=30,
        )
        result  = _extract_json(content)
        verdict = str(result.get("verdict", "")).lower().strip()
        reason  = str(result.get("reason", "")).strip()
        if verdict not in ("correct", "partial", "wrong"):
            verdict = "wrong"

    except Exception as exc:
        grader = "fuzzy_fallback"
        logger.warning(
            "quiz_grade_fallback reason=%s",
            type(exc).__name__,
        )
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
        reason = "Evaluated by text similarity (AI unavailable)."

    duration_ms = round((time.perf_counter() - t0) * 1000)
    is_correct  = verdict == "correct"

    logger.info(
        "quiz_grade grader=%s verdict=%s correct=%s duration_ms=%d",
        grader, verdict, is_correct, duration_ms,
    )
    # Log answer text at DEBUG only — never at INFO
    logger.debug(
        "quiz_grade_detail user_answer_len=%d correct_answer_len=%d",
        len(user_answer), len(correct_answer),
    )

    return {"verdict": verdict, "reason": reason, "grader": grader}
