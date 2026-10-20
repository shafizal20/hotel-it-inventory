import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import DUMMY_HASH, make_session, verify_password
from app.db.database import get_db
from app.db.models import User
from app.dependencies.authentication import current_user

router = APIRouter(prefix="/auth", tags=["auth"])
_fails: dict[str, list[float]] = defaultdict(list)  # in-memory; use Redis if running multiple workers
MAX_FAILS, WINDOW = 5, 15 * 60

class Login(BaseModel):
    username: str
    password: str

@router.post("/login")
def login(body: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    key = f"{request.client.host}:{body.username.lower()}"
    now = time.time()
    _fails[key] = [t for t in _fails[key] if now - t < WINDOW]
    if len(_fails[key]) >= MAX_FAILS:
        raise HTTPException(429, "Too many failed attempts. Try again later.")
    user = db.scalar(select(User).where(User.username == body.username))
    ok = verify_password(user.password if user else DUMMY_HASH, body.password) and user is not None
    if not ok:
        _fails[key].append(now)
        raise HTTPException(401, "Invalid username or password")
    _fails.pop(key, None)
    response.set_cookie("session", make_session(user.id), httponly=True, samesite="strict",
                        secure=settings.app_env == "production", max_age=settings.session_max_age)
    return {"id": user.id, "username": user.username}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"ok": True}

@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"id": user.id, "username": user.username}
