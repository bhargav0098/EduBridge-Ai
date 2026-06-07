from sqlalchemy.orm import Session
from ..models.models import Resource, ResourceBooking, Notification
from ..schemas.schemas import ResourceBookingCreate
from datetime import datetime
from sqlalchemy import or_, and_

class ResourceService:
    @staticmethod
    def get_resources(db: Session):
        return db.query(Resource).all()

    @staticmethod
    def book_resource(db: Session, booking_data: ResourceBookingCreate, user_id: str):
        # Conflict Detection
        # Check if any booking overlaps with the requested time for the same resource
        conflict = db.query(ResourceBooking).filter(
            ResourceBooking.resource_id == booking_data.resource_id,
            or_(
                and_(ResourceBooking.start_time <= booking_data.start_time, ResourceBooking.end_time > booking_data.start_time),
                and_(ResourceBooking.start_time < booking_data.end_time, ResourceBooking.end_time >= booking_data.end_time),
                and_(ResourceBooking.start_time >= booking_data.start_time, ResourceBooking.end_time <= booking_data.end_time)
            )
        ).first()
        
        if conflict:
            return None # Indicate conflict
            
        booking = ResourceBooking(
            resource_id=booking_data.resource_id,
            user_id=user_id,
            start_time=booking_data.start_time,
            end_time=booking_data.end_time
        )
        db.add(booking)
        
        # Create notification
        resource = db.query(Resource).filter(Resource.id == booking_data.resource_id).first()
        notification = Notification(
            user_id=user_id,
            title="Booking Confirmation",
            message=f"Your booking for {resource.name} from {booking_data.start_time} to {booking_data.end_time} is confirmed.",
            type="booking"
        )
        db.add(notification)
        
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def get_my_bookings(db: Session, user_id: str):
        return db.query(ResourceBooking).filter(ResourceBooking.user_id == user_id).all()

    @staticmethod
    def delete_booking(db: Session, booking_id: int, user_id: str):
        booking = db.query(ResourceBooking).filter(
            ResourceBooking.id == booking_id,
            ResourceBooking.user_id == user_id
        ).first()
        if booking:
            db.delete(booking)
            db.commit()
            return True
        return False
