"""One-time admin setup:  python create_admin.py   (prompts for credentials; never hardcoded)."""
import getpass, sys
from sqlalchemy import select, func
from app.db.database import SessionLocal
from app.db.models import User
from app.core.security import hash_password

db = SessionLocal()
if db.scalar(select(func.count()).select_from(User)):
    sys.exit("An administrator already exists. Refusing to create another.")
name = input("Enter administrator username: ").strip()
pw = getpass.getpass("Enter administrator password: ")
if len(name) < 3 or len(pw) < 12 or pw != getpass.getpass("Confirm: "):
    sys.exit("Invalid input or passwords do not match.")
db.add(User(username=name, password=hash_password(pw))); db.commit()
print("Administrator created.")
