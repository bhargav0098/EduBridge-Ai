from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import User
from ..schemas.schemas import EventCreate, EventSchema
from ..services.event_service import EventService
from .auth import verify_token
from ..config import settings
import uuid

router = APIRouter()
security = HTTPBearer(auto_error=False)


def get_event_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials:
        try:
            return verify_token(credentials, db)
        except Exception:
            pass
    if settings.DEBUG:
        from ..models.models import UserRole
        user = db.query(User).filter(User.email == "dev_user@edubridge.com").first()
        if user:
            return user
        user = User(id=str(uuid.uuid4()), email="dev_user@edubridge.com", name="Developer User", role=UserRole.TEACHER)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


@router.post("/", response_model=EventSchema)
def create_event(
    data: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_event_user),
):
    return EventService.create_event(db, data, current_user.id)


@router.get("/upcoming", response_model=List[EventSchema])
def get_upcoming_events(db: Session = Depends(get_db)):
    return EventService.get_upcoming_events(db)


@router.post("/{id}/attend")
def attend_event(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_event_user),
):
    return EventService.attend_event(db, id, current_user.id)
