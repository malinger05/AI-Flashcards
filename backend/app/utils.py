"""
utils.py — shared backend utilities.
Imported by main.py and other modules that need safe log helpers.
"""

import re


def mask_email(email: str) -> str:
    """
    Mask an email address for safe logging.
    's***@domain.com'  (first char + *** + @domain)

    Examples
    --------
    >>> mask_email("student@example.com")
    's***@example.com'
    >>> mask_email("a@b.com")
    'a***@b.com'
    """
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    return f"{local[0]}***@{domain}" if local else f"***@{domain}"
