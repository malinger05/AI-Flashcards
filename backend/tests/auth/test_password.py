from app.auth import generate_token, hash_password, verify_password


def test_hash_and_verify_password():
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_generate_token_is_unique_hex():
    token_a = generate_token(1)
    token_b = generate_token(1)

    assert token_a != token_b
    assert len(token_a) == 64
    assert all(c in "0123456789abcdef" for c in token_a)
