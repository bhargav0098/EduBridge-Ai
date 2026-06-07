from sqlalchemy.orm import Session
from ..models.models import Event, EventAttendee, Notification
from ..schemas.schemas import EventCreate
from datetime import datetime

class EventService:
    @staticmethod
    def create_event(db: Session, event_data: EventCreate, user_id: str):
        event = Event(
            title=event_data.title,
            description=event_data.description,
            start_time=event_data.start_time,
            end_time=event_data.end_time,
            location=event_data.location,
            created_by=user_id
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def get_upcoming_events(db: Session):
        return db.query(Event).filter(Event.start_time >= datetime.now()).order_by(Event.start_time.asc()).all()

    @staticmethod
    def attend_event(db: Session, event_id: int, user_id: str):
        # Check if already attending
        existing = db.query(EventAttendee).filter(
            EventAttendee.event_id == event_id,
            EventAttendee.user_id == user_id
        ).first()
        
        if existing:
            return existing
            
        attendee = EventAttendee(event_id=event_id, user_id=user_id, status="going")
        db.add(attendee)
        
        # Create notification
        event = db.query(Event).filter(Event.id == event_id).first()
        notification = Notification(
            user_id=user_id,
            title="Event RSVP Confirmed",
            message=f"You have successfully RSVP'd for {event.title}.",
            type="event"
        )
        db.add(notification)
        
        db.commit()
        db.refresh(attendee)
        return attendee
