import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.models import User, UserRole
from ..services.dashboard_service import DashboardService
from .auth import verify_token
from ..utils.sse_manager import sse_manager

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    if current_user.role == UserRole.STUDENT:
        return DashboardService.get_student_stats(db, current_user.id)
    else:
        return DashboardService.get_teacher_stats(db, current_user.id)

@router.get("/timeline")
def get_timeline(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Returns the global timeline of classroom activities to power the Shared Connection Agent feed
    return DashboardService.get_timeline(db, limit=limit)

@router.get("/stream")
async def sse_stream(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # Subscriber queue for SSE updates
    queue = asyncio.Queue()
    await sse_manager.subscribe(queue, current_user.id)

    async def event_generator():
        try:
            # Yield initial connection confirmation
            yield f"data: {json.dumps({'event': 'connected', 'user_id': current_user.id})}\n\n"

            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                try:
                    # Wait for message with a timeout to send periodic pings
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield msg
                except asyncio.TimeoutError:
                    # SSE Comment line to keep connection alive
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await sse_manager.unsubscribe(queue, current_user.id)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
