# backend/models/__init__.py
"""Expose all SQLAlchemy models.
"""

from .models import (
    Base,
    UserRole,
    User,
    AttendanceSession,
    AttendanceRecord,
    LowAttendanceAlert,
    Note,
    NoteTag,
    NoteShare,
    Event,
    EventAttendee,
    Resource,
    ResourceBooking,
    StudentProfile,
    StudyGroup,
    StudyGroupMember,
    StudyGroupMessage,
    Notification,
    ChatSession,
    ChatMessage,
    Question,
    StudentPerformance,
)
