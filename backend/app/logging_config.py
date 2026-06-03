"""
logging_config.py — S3-001
Centralised Python logging for the FlashCards backend.
Call setup_logging() once at app startup before any route handles traffic.

SCRUM-63 (observability QA): after deploy, confirm startup_complete in logs and that
Bearer tokens / raw passwords never appear at INFO (see _ScrubFilter below).
"""

import logging
import logging.config
import os
import re


# ── Token / password scrubber ─────────────────────────────────────────────────

class _ScrubFilter(logging.Filter):
    """Strip bearer tokens and raw passwords from every log record."""

    _BEARER  = re.compile(r"Bearer\s+[A-Fa-f0-9]{10,}", re.IGNORECASE)
    _PASSWORD = re.compile(r'"password"\s*:\s*"[^"]*"', re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self._BEARER.sub("Bearer [REDACTED]", record.msg)
            record.msg = self._PASSWORD.sub('"password": "[REDACTED]"', record.msg)
        return True


# ── Public API ────────────────────────────────────────────────────────────────

def setup_logging() -> None:
    """
    Configure the root logger.

    Reads LOG_LEVEL from the environment (default INFO).
    Format: timestamp  LEVEL     logger_name  message
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "scrub": {"()": _ScrubFilter},
        },
        "formatters": {
            "standard": {
                "format": "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "standard",
                "filters": ["scrub"],
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": level,
        },
        # Keep uvicorn's own loggers but route them through our handler/filter
        "loggers": {
            "uvicorn":        {"handlers": ["console"], "propagate": False, "level": level},
            "uvicorn.error":  {"handlers": ["console"], "propagate": False, "level": level},
            "uvicorn.access": {"handlers": ["console"], "propagate": False, "level": level},
            "sqlalchemy.engine": {"handlers": ["console"], "propagate": False, "level": "WARNING"},
        },
    }

    logging.config.dictConfig(config)
    logging.getLogger("flashcards").info(
        "startup_complete log_level=%s", level_name
    )
