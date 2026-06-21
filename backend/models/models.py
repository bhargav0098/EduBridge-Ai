from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float, JSON, Enum, UniqueConstraint
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
    assignments_created = relationship("Assignment", back_populates="teacher")
    submissions = relationship("AssignmentSubmission", back_populates="student")
    activity_logs = relationship("ActivityLog", back_populates="user")
    achievements = relationship("Achievement", back_populates="user")

# Authentication Models
class OTPRequest(Base):
    __tablename__ = "otp_requests"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
    upvotes = relationship("NoteUpvote", back_populates="note", cascade="all, delete-orphan")

    @property
    def upvotes_count(self) -> int:
        return len(self.upvotes) if self.upvotes else 0

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

class NoteUpvote(Base):
    __tablename__ = "note_upvotes"
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    note = relationship("Note", back_populates="upvotes")

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
    question_text = Column(Text, nullable=False, default="")
    difficulty = Column(Integer, default=1) # 1-5
    type = Column(String, default="MCQ") # MCQ or SHORT
    options = Column(JSON, nullable=True)
    answer = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)

class StudentPerformance(Base):
    __tablename__ = "student_performance"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    correct = Column(Boolean, nullable=False)
    attempt_time = Column(DateTime(timezone=True), server_default=func.now())

# Assignment and Tasks
class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=False)
    class_id = Column(String, index=True, nullable=False)
    teacher_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    teacher = relationship("User", back_populates="assignments_created")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")

class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"
    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=False)
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="assigned")  # "assigned", "submitted", "graded"
    submission_content = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    grade = Column(String, nullable=True)
    feedback = Column(Text, nullable=True)

    # Relationships
    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("User", back_populates="submissions")

# Activity Logging
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "student" or "teacher"
    action_type = Column(String, nullable=False)  # "task_completed", "doubt_asked", etc.
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    metadata_json = Column(JSON, nullable=True)
    related_id = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="activity_logs")

# Achievements/Badges
class Achievement(Base):
    __tablename__ = "achievements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    badge_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    points = Column(Integer, default=0)
    badge_hash = Column(String, nullable=True)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="achievements")

from sqlalchemy.event import listens_for
import hashlib
from datetime import datetime

@listens_for(Achievement, 'before_insert')
def receive_before_insert(mapper, connection, target):
    if not target.badge_hash:
        timestamp_str = datetime.now().isoformat()
        raw = f"{target.user_id}:{target.badge_name}:{timestamp_str}"
        target.badge_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()

# Doubts/Questions
class Doubt(Base):
    __tablename__ = "doubts"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    teacher_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    content = Column(Text, nullable=False)
    response = Column(Text, nullable=True)
    status = Column(String, default="open")  # "open" or "resolved"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    student = relationship("User", foreign_keys=[student_id])
    teacher = relationship("User", foreign_keys=[teacher_id])
    assignment = relationship("Assignment")


class StudentTopicMastery(Base):
    __tablename__ = "student_topic_mastery"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    topic = Column(String, nullable=False, index=True)
    p_known = Column(Float, default=0.25, nullable=False)
    last_practiced = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('student_id', 'topic', name='_student_topic_uc'),)

