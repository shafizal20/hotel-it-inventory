import os
os.environ.update(DB_USER="x", DB_PASSWORD="x", SESSION_SECRET="test-secret")
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import get_db
from app.db.models import Base, User
from app.core.security import hash_password
import app.routers.auth as auth_mod

PW = "correct horse battery"

@pytest.fixture
def client():
    """Isolated in-memory SQLite database: tests can never touch real PostgreSQL inventory data."""
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    S = sessionmaker(bind=eng, autoflush=False)
    with S() as s:
        s.add(User(username="admin", password=hash_password(PW))); s.commit()
    def override():
        db = S()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db] = override
    auth_mod._fails.clear()
    with TestClient(app) as c:
        c.headers["X-Requested-With"] = "XMLHttpRequest"
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def auth(client):
    assert client.post("/api/v1/auth/login", json={"username": "admin", "password": PW}).status_code == 200
    return client
