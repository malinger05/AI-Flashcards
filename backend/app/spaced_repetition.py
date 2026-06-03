"""
SCRUM-78: Spaced repetition scheduling for flashcards via next_review_at.

Intervals (days) after each successful review: 1 → 3 → 7 → 14 → 30.
A missed card is due again immediately (next_review_at = now, step reset).
"""

from datetime import datetime, timedelta, timezone

INTERVAL_DAYS = (1, 3, 7, 14, 30)


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def is_card_due(next_review_at: datetime | None, now: datetime | None = None) -> bool:
    """True when the card has never been scheduled or its review date has passed."""
    if next_review_at is None:
        return True
    now = _aware(now or datetime.now(timezone.utc))
    return _aware(next_review_at) <= now


def compute_next_review(
    *,
    knew_it: bool,
    review_step: int,
    now: datetime | None = None,
) -> tuple[datetime, int]:
    """
    Return (next_review_at, new_review_step) after a study swipe.
    """
    now = _aware(now or datetime.now(timezone.utc))
    if not knew_it:
        return now, 0
    days = INTERVAL_DAYS[min(review_step, len(INTERVAL_DAYS) - 1)]
    new_step = min(review_step + 1, len(INTERVAL_DAYS) - 1)
    return now + timedelta(days=days), new_step
