from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import NotificationSchema

router = APIRouter()

@router.get("/user/{user_id}", response_model=List[NotificationSchema])
def get_user_notifications(user_id: str, db: Session = Depends(get_db)):
    return []

@router.post("/{notification_id}/read")
def mark_read(notification_id: int, db: Session = Depends(get_db)):
    return {"status": "success"}
