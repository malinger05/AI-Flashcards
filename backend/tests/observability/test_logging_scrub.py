"""SCRUM-63: log scrubber must redact tokens and passwords."""

import logging

from app.logging_config import _ScrubFilter


def test_scrub_filter_redacts_bearer_token():
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg='auth failed Bearer abcdef0123456789abcdef',
        args=(),
        exc_info=None,
    )
    _ScrubFilter().filter(record)
    assert "Bearer [REDACTED]" in record.msg
    assert "abcdef0123456789" not in record.msg


def test_scrub_filter_redacts_password_field():
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg='body {"password": "hunter2"}',
        args=(),
        exc_info=None,
    )
    _ScrubFilter().filter(record)
    assert '"password": "[REDACTED]"' in record.msg
    assert "hunter2" not in record.msg
