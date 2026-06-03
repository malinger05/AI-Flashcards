import pytest

from app.utils import mask_email


@pytest.mark.parametrize(
    "email, expected",
    [
        ("student@example.com", "s***@example.com"),
        ("a@b.com", "a***@b.com"),
        ("@nodomain.com", "***@nodomain.com"),
        ("not-an-email", "***"),
        ("", "***"),
    ],
)
def test_mask_email(email, expected):
    assert mask_email(email) == expected
