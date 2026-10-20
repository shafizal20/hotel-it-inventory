from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from itsdangerous import URLSafeTimedSerializer, BadSignature
from app.core.config import settings

_ph = PasswordHasher()  # Argon2id
_ser = URLSafeTimedSerializer(settings.session_secret, salt="session-v1")
DUMMY_HASH = _ph.hash("dummy-password-for-timing")

def hash_password(p: str) -> str:
    return _ph.hash(p)

def verify_password(hashed: str, p: str) -> bool:
    try:
        return _ph.verify(hashed, p)
    except (VerifyMismatchError, InvalidHashError):
        return False

def make_session(user_id: int) -> str:
    return _ser.dumps({"uid": user_id})

def read_session(token: str) -> int | None:
    try:
        return _ser.loads(token, max_age=settings.session_max_age)["uid"]
    except (BadSignature, KeyError):
        return None
