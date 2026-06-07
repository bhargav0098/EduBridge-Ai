# backend/main.py
"""FastAPI application entry point.
Includes routers for all modules.
"""

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from .config import settings
from .database import engine, Base
from .api import attendance, notes, events, resources, peer_match, notifications, auth, chat, ocr, speech, quiz, assignments, doubts, dashboard
from .utils.limiter import limiter

app = FastAPI(title="EduBridge API", version="0.1.0")

# Setup Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware — restrict origins in production
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.DEBUG:
    # In debug mode allow all origins for convenience
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global error handler — don't expose internal details in production
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        return JSONResponse(
            status_code=500,
            content={
                "error": exc.__class__.__name__,
                "code": 500,
                "message": str(exc),
            },
        )
    return JSONResponse(
        status_code=500,
        content={"error": "InternalServerError", "code": 500, "message": "An unexpected error occurred."},
    )


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(speech.router, prefix="/api/speech", tags=["Multilingual Speech"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["Donut OCR Solver"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Adaptive Quiz"])

app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(peer_match.router, prefix="/api/peer-match", tags=["Peer Matching"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(assignments.router, prefix="/api/assignments", tags=["Assignments"])
app.include_router(doubts.router, prefix="/api/doubts", tags=["Doubts"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])


@app.on_event("startup")
async def on_startup():
    """Create DB tables on startup (idempotent — safe for production)."""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if "questions" in inspector.get_table_names():
        columns = [c["name"] for c in inspector.get_columns("questions")]
        if "question_text" not in columns:
            # Drop questions table to recreate with new schema
            Base.metadata.tables["questions"].drop(bind=engine)
            
    Base.metadata.create_all(bind=engine)

    # Seed mock students for dynamic classes list
    from .database import SessionLocal
    from .models.models import User, UserRole, StudentProfile, CourseClass
    from .services.auth_service import AuthService
    import uuid

    db = SessionLocal()
    try:
        # Seed classes if empty
        if not db.query(CourseClass).first():
            seed_classes = [
                CourseClass(id="c1", name="CS-3A", subject="Data Structures", schedule="Mon/Thu/Fri 9:00 AM"),
                CourseClass(id="c2", name="CS-3B", subject="Mathematics", schedule="Tue/Thu 1:00 PM"),
                CourseClass(id="c3", name="CS-4A", subject="English Literature", schedule="Tue/Fri 1:00 PM"),
            ]
            db.bulk_save_objects(seed_classes)
            db.commit()

        # Update Dipshika to CS-3A if class_name is Class 11
        dipshika_profile = db.query(StudentProfile).join(User).filter(User.email == "bhattacharyadipshika2@gmail.com").first()
        if dipshika_profile and dipshika_profile.class_name == "Class 11":
            dipshika_profile.class_name = "CS-3A"
            db.commit()

        # Seed students list
        seed_students = [
            {"name": "Arya Sharma", "email": "arya@edu.ai", "class_name": "CS-3A"},
            {"name": "Priya Singh", "email": "priya@edu.ai", "class_name": "CS-3A"},
            {"name": "Arjun Kaur", "email": "arjun@edu.ai", "class_name": "CS-3B"},
            {"name": "Suraj Mishra", "email": "suraj@edu.ai", "class_name": "CS-3B"},
            {"name": "Riya Patel", "email": "riya@edu.ai", "class_name": "CS-4A"},
            {"name": "Amit Verma", "email": "amit@edu.ai", "class_name": "CS-4A"},
        ]

        password_hash = AuthService.hash_password("password123")

        for s in seed_students:
            exists = db.query(User).filter(User.email == s["email"]).first()
            if not exists:
                user_id = str(uuid.uuid4())
                new_user = User(
                    id=user_id,
                    email=s["email"],
                    name=s["name"],
                    hashed_password=password_hash,
                    role=UserRole.STUDENT,
                )
                db.add(new_user)
                db.flush()

                profile = StudentProfile(
                    user_id=user_id,
                    weak_subjects=[],
                    study_time_preference="Morning",
                    class_name=s["class_name"],
                    elo=1200,
                )
                db.add(profile)
        db.commit()

        # Seed adaptive quiz questions on start
        from .api.quiz import seed_questions
        seed_questions(db)
    except Exception as e:
        print("Seeding error:", e)
        db.rollback()
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.VERSION}


if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
