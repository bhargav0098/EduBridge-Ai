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
from .api import attendance, notes, events, resources, peer_match, notifications, auth, chat, ocr, speech, quiz
from .utils.limiter import limiter

app = FastAPI(title="EduBridge API", version="0.1.0")

# Setup Rate Limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware to allow Next.js frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # allows local Next.js or any origin for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": exc.__class__.__name__,
            "code": 500,
            "message": str(exc)
        }
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

# Create DB tables on startup (for dev purposes only)
@app.on_event("startup")
async def on_startup():
    # Since engine is sync, create tables synchronously
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
