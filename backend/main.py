# backend/main.py
"""FastAPI application entry point.
Includes routers for all modules.
"""

import uvicorn
from fastapi import FastAPI
from .config import settings
from .database import engine, Base
from .api import attendance, notes, events, resources, peer_match, notifications

app = FastAPI(title="EduBridge API", version="0.1.0")

# Include routers
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(notes.router, prefix="/api/notes", tags=["Notes"])
app.include_router(events.router, prefix="/api/events", tags=["Events"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(peer_match.router, prefix="/api/peer-match", tags=["Peer Matching"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])

# Create DB tables on startup (for dev purposes only)
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        # In production migrations are managed by Alembic
        await conn.run_sync(Base.metadata.create_all)

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
