from backend.database import SessionLocal, Base, engine
from backend.models.models import User

# Ensure tables are created
Base.metadata.create_all(bind=engine)


db = SessionLocal()
users = db.query(User).all()
print("Total Users:", len(users))
for u in users:
    print(f"User: {u.email}, Role: {u.role}, Hash: {u.hashed_password[:10]}...")

db.close()
