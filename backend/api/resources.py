from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.models import User
from ..schemas.schemas import ResourceSchema, ResourceBookingCreate, ResourceBookingSchema
from ..services.resource_service import ResourceService
from .auth import verify_token
from ..config import settings
import uuid

router = APIRouter()
security = HTTPBearer(auto_error=False)


def get_resource_user(
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
        user = User(id=str(uuid.uuid4()), email="dev_user@edubridge.com", name="Developer User", role=UserRole.STUDENT)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


@router.get("/", response_model=List[ResourceSchema])
def get_resources(db: Session = Depends(get_db)):
    return ResourceService.get_resources(db)


@router.post("/book", response_model=ResourceBookingSchema)
def book_resource(
    data: ResourceBookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_resource_user),
):
    booking = ResourceService.book_resource(db, data, current_user.id)
    if not booking:
        raise HTTPException(status_code=409, detail="Resource already booked for this time slot")
    return booking


@router.get("/bookings/mine", response_model=List[ResourceBookingSchema])
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_resource_user),
):
    return ResourceService.get_my_bookings(db, current_user.id)


@router.delete("/bookings/{id}")
def delete_booking(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_resource_user),
):
    success = ResourceService.delete_booking(db, id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Booking not found or not authorized")
    return {"message": "Booking cancelled"}
