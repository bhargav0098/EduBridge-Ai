from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import ResourceSchema, ResourceBookingCreate, ResourceBookingSchema
from ..services.resource_service import ResourceService

router = APIRouter()

@router.get("/", response_model=List[ResourceSchema])
def get_resources(db: Session = Depends(get_db)):
    return ResourceService.get_resources(db)

@router.post("/book", response_model=ResourceBookingSchema)
def book_resource(data: ResourceBookingCreate, db: Session = Depends(get_db)):
    user_id = "demo_student_1" # Mock
    booking = ResourceService.book_resource(db, data, user_id)
    if not booking:
        raise HTTPException(status_code=409, detail="Resource already booked for this time slot")
    return booking

@router.get("/bookings/mine", response_model=List[ResourceBookingSchema])
def get_my_bookings(db: Session = Depends(get_db)):
    user_id = "demo_student_1" # Mock
    return ResourceService.get_my_bookings(db, user_id)

@router.delete("/bookings/{id}")
def delete_booking(id: int, db: Session = Depends(get_db)):
    user_id = "demo_student_1" # Mock
    success = ResourceService.delete_booking(db, id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Booking not found or not authorized")
    return {"message": "Booking cancelled"}
