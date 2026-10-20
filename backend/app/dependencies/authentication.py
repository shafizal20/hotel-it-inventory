from fastapi import Cookie, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.core.security import read_session

def current_user(request: Request, session: str | None = Cookie(default=None),
                 db: Session = Depends(get_db)) -> User:
    uid = read_session(session) if session else None
    user = db.get(User, uid) if uid else None
    if not user:
        raise HTTPException(401, "Not authenticated")
    # CSRF defence (with SameSite=Strict): state-changing calls must carry a custom header.
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get("x-requested-with") != "XMLHttpRequest":
        raise HTTPException(403, "Missing CSRF header")
    return user
