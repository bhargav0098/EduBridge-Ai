from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from ..models.models import UserRole

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.STUDENT
    profile_image: Optional[str] = None

class UserCreate(UserBase):
    id: str # From Firebase or external auth

class UserSchema(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceRecordCreate(BaseModel):
    student_id: str
    status: str = "present"

class AttendanceSessionCreate(BaseModel):
    class_id: str
    teacher_id: str
    records: List[AttendanceRecordCreate]

class AttendanceRecordSchema(BaseModel):
    student_id: str
    status: str
    
    class Config:
        from_attributes = True

class AttendanceSessionSchema(BaseModel):
    id: int
    class_id: str
    date: datetime
    teacher_id: str
    
    class Config:
        from_attributes = True

class AttendanceSummary(BaseModel):
    student_id: str
    total_sessions: int
    present_count: int
    attendance_percentage: float

# Notes Schemas
class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = None
    tags: Optional[List[str]] = []

class NoteSchema(BaseModel):
    id: int
    title: str
    content: Optional[str]
    file_path: Optional[str]
    owner_id: str
    created_at: datetime
    tags: List[str] = []
    
    class Config:
        from_attributes = True

# Events Schemas
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    location: Optional[str] = None

class EventSchema(BaseModel):
    id: int
    title: str
    description: Optional[str]
    start_time: datetime
    end_time: datetime
    location: Optional[str]
    created_by: str
    
    class Config:
        from_attributes = True

# Resources Schemas
class ResourceBookingCreate(BaseModel):
    resource_id: int
    start_time: datetime
    end_time: datetime

class ResourceBookingSchema(BaseModel):
    id: int
    resource_id: int
    user_id: str
    start_time: datetime
    end_time: datetime
    
    class Config:
        from_attributes = True

class ResourceSchema(BaseModel):
    id: int
    name: str
    type: str
    description: Optional[str]
    
    class Config:
        from_attributes = True

# Peer Matching Schemas
class StudentProfileCreate(BaseModel):
    weak_subjects: List[str]
    study_time_preference: str
    class_name: str

class PeerMatchResponse(BaseModel):
    user_id: str
    name: str
    score: float
    shared_weak_subjects: List[str]

class StudyGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    subject: str

class StudyGroupSchema(BaseModel):
    id: int
    name: str
    description: Optional[str]
    subject: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str

# Notification Schemas
class NotificationSchema(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
