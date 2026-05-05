import hashlib
import os
import bcrypt


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the password."""
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def generate_token(user_id: int) -> str:
    """Generate a simple secure token: hex(sha256(random + user_id))."""
    raw = os.urandom(32) + str(user_id).encode()
    return hashlib.sha256(raw).hexdigest()