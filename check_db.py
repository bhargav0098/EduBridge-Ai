from backend.database import SessionLocal
from backend.models.models import User

db = SessionLocal()
users = db.query(User).all()
print("Total Users:", len(users))
for u in users:
    print(f"User: {u.email}, Role: {u.role}, Hash: {u.hashed_password[:10]}...")

db.close()
