from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import EventCreate, EventSchema
from ..services.event_service import EventService

router = APIRouter()

@router.post("/", response_model=EventSchema)
def create_event(data: EventCreate, db: Session = Depends(get_db)):
    user_id = "demo_teacher_1" # Mock
    return EventService.create_event(db, data, user_id)

@router.get("/upcoming", response_model=List[EventSchema])
def get_upcoming_events(db: Session = Depends(get_db)):
    return EventService.get_upcoming_events(db)

@router.post("/{id}/attend")
def attend_event(id: int, db: Session = Depends(get_db)):
    user_id = "demo_student_1" # Mock
    return EventService.attend_event(db, id, user_id)
