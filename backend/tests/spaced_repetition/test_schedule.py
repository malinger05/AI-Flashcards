from datetime import datetime, timedelta, timezone

from app.spaced_repetition import compute_next_review, is_card_due


def test_new_card_is_due_when_next_review_at_is_none():
    assert is_card_due(None)


def test_future_review_is_not_due():
    future = datetime.now(timezone.utc) + timedelta(days=3)
    assert not is_card_due(future)


def test_success_advances_interval():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    nxt, step = compute_next_review(knew_it=True, review_step=0, now=now)
    assert step == 1
    assert nxt == now + timedelta(days=1)


def test_failure_resets_to_due_now():
    now = datetime(2026, 6, 1, tzinfo=timezone.utc)
    nxt, step = compute_next_review(knew_it=False, review_step=3, now=now)
    assert step == 0
    assert nxt == now
