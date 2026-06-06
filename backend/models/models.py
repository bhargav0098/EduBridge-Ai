from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.STUDENT)
    profile_image = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    attendance_records = relationship("AttendanceRecord", back_populates="student")
    notes = relationship("Note", back_populates="owner")
    resource_bookings = relationship("ResourceBooking", back_populates="user")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    study_groups = relationship("StudyGroupMember", back_populates="user")

# Attendance Models
class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(String, index=True, nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
    teacher_id = Column(String, ForeignKey("users.id"))
    
    records = relationship("AttendanceRecord", back_populates="session")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"))
    student_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="present") # present, absent, late
    
    session = relationship("AttendanceSession", back_populates="records")
    student = relationship("User", back_populates="attendance_records")

class LowAttendanceAlert(Base):
    __tablename__ = "low_attendance_alerts"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"))
    percentage = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_resolved = Column(Boolean, default=False)

# Notes Models
class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text)
    file_path = Column(String) # For PDF uploads
    owner_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    owner = relationship("User", back_populates="notes")
    tags = relationship("NoteTag", back_populates="note")
    shares = relationship("NoteShare", back_populates="note")

class NoteTag(Base):
    __tablename__ = "note_tags"
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    tag = Column(String, index=True)
    
    note = relationship("Note", back_populates="tags")

class NoteShare(Base):
    __tablename__ = "note_shares"
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    user_id = Column(String, ForeignKey("users.id")) # Shared with
    
    note = relationship("Note", back_populates="shares")

# Events Models
class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    location = Column(String)
    created_by = Column(String, ForeignKey("users.id"))
    
    attendees = relationship("EventAttendee", back_populates="event")

class EventAttendee(Base):
    __tablename__ = "event_attendees"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"))
    user_id = Column(String, ForeignKey("users.id"))
    status = Column(String, default="going") # going, interested, not_going
    
    event = relationship("Event", back_populates="attendees")

# Resources Models
class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String) # room, equipment, lab
    description = Column(Text)
    
    bookings = relationship("ResourceBooking", back_populates="resource")

class ResourceBooking(Base):
    __tablename__ = "resource_bookings"
    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"))
    user_id = Column(String, ForeignKey("users.id"))
    start_time = Column(DateTime(timezone=True))
    end_time = Column(DateTime(timezone=True))
    
    resource = relationship("Resource", back_populates="bookings")
    user = relationship("User", back_populates="resource_bookings")

# Peer Matching & Study Group Models
class StudentProfile(Base):
    __tablename__ = "student_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    weak_subjects = Column(JSON) # List of strings
    study_time_preference = Column(String) # Morning, Afternoon, Evening
    class_name = Column(String)
    elo = Column(Integer, default=1200)
    
    user = relationship("User", back_populates="student_profile")

class StudyGroup(Base):
    __tablename__ = "study_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    subject = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    members = relationship("StudyGroupMember", back_populates="group")
    messages = relationship("StudyGroupMessage", back_populates="group")

class StudyGroupMember(Base):
    __tablename__ = "study_group_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("study_groups.id"))
    user_id = Column(String, ForeignKey("users.id"))
    role = Column(String, default="member") # creator, member
    
    group = relationship("StudyGroup", back_populates="members")
    user = relationship("User", back_populates="study_groups")

class StudyGroupMessage(Base):
    __tablename__ = "study_group_messages"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("study_groups.id"))
    user_id = Column(String, ForeignKey("users.id"))
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    group = relationship("StudyGroup", back_populates="messages")

# Notifications
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    message = Column(Text)
    type = Column(String) # attendance, event, booking
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# AI Chat history models
class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False) # "user" or "assistant"
    content = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True) # Chunk source IDs or details
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")

# Adaptive Quiz models
class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True, nullable=False)
    topic = Column(String, index=True)
    difficulty = Column(Integer, default=1) # 1-5
    type = Column(String, default="MCQ") # MCQ or SHORT
    options = Column(JSON, nullable=True)
    answer = Column(String, nullable=False)

class StudentPerformance(Base):
    __tablename__ = "student_performance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    correct = Column(Boolean, nullable=False)
    attempt_time = Column(DateTime(timezone=True), server_default=func.now())
