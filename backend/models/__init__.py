# backend/models/__init__.py
"""Expose all SQLAlchemy models for Alembic autogeneration and imports.
This file imports each model module so that Alembic can discover the
metadata when running `alembic revision --autogenerate`.
"""

# Attendance models
from .attendance import AttendanceSession, AttendanceRecord, LowAttendanceAlert

# Notes models
from .notes import Note, Tag, NoteShare

# Events models
from .events import Event, UserEvent

# Resources models
from .resources import Resource, ResourceBooking

# Peer‑matching models
from .peer_match import StudentProfile, StudyGroup, StudyGroupMember

# Notification model
from .notifications import Notification
