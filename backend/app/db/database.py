from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Never calls create_all(): existing tables are used exactly as they are.
engine = create_engine(
    URL.create("postgresql+psycopg2", settings.db_user, settings.db_password,
               settings.db_host, settings.db_port, settings.db_name),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
