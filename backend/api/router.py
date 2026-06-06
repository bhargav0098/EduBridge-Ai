from fastapi import APIRouter
from . import attendance, notes, events, resources

api_router = APIRouter()

api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(notes.router, prefix="/notes", tags=["notes"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(resources.router, prefix="/resources", tags=["resources"])
