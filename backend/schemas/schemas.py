from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from ..models.models import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.STUDENT
    profile_image: Optional[str] = None


class UserCreate(UserBase):
    id: str  # From Firebase or external auth


class UserSchema(UserBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}


class AttendanceSessionSchema(BaseModel):
    id: int
    class_id: str
    date: datetime
    teacher_id: str

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}

    @classmethod
    def model_validate(cls, obj, *args, **kwargs):
        """Handle ORM NoteTag relationship → List[str]."""
        instance = super().model_validate(obj, *args, **kwargs)
        # If tags came from ORM, they are NoteTag objects with .tag attribute
        if obj and hasattr(obj, "tags") and obj.tags:
            raw_tags = obj.tags
            if raw_tags and hasattr(raw_tags[0], "tag"):
                instance.tags = [t.tag for t in raw_tags]
        return instance


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

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}


class ResourceSchema(BaseModel):
    id: int
    name: str
    type: str
    description: Optional[str]

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}


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

    model_config = {"from_attributes": True}


# Auth Schemas
class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Optional[UserRole] = UserRole.STUDENT
    remember: Optional[bool] = False

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name must not be empty")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember: Optional[bool] = False


class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponseSchema(TokenSchema):
    user: UserSchema


class ChatInput(BaseModel):
    message: str
    language: str = "English"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]
    session_id: str


# Assignment & Submission Schemas
class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: datetime
    class_id: str


class AssignmentSchema(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: datetime
    class_id: str
    teacher_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AssignmentSubmissionCreate(BaseModel):
    submission_content: str


class AssignmentSubmissionSchema(BaseModel):
    id: int
    assignment_id: int
    student_id: str
    status: str
    submission_content: Optional[str] = None
    submitted_at: Optional[datetime] = None
    grade: Optional[str] = None
    feedback: Optional[str] = None
    assignment: Optional[AssignmentSchema] = None

    model_config = {"from_attributes": True}


class AssignmentSubmissionGrade(BaseModel):
    grade: str
    feedback: Optional[str] = None


# Activity Log Schemas
class ActivityLogCreate(BaseModel):
    action_type: str
    metadata_json: Optional[dict] = None
    related_id: Optional[str] = None


class ActivityLogSchema(BaseModel):
    id: int
    user_id: str
    role: str
    action_type: str
    timestamp: datetime
    metadata_json: Optional[dict] = None
    related_id: Optional[str] = None

    model_config = {"from_attributes": True}


# Achievement Schemas
class AchievementSchema(BaseModel):
    id: int
    user_id: str
    badge_name: str
    description: Optional[str] = None
    points: int
    earned_at: datetime

    model_config = {"from_attributes": True}


# Doubt Schemas
class DoubtCreate(BaseModel):
    content: str
    teacher_id: Optional[str] = None
    assignment_id: Optional[int] = None


class DoubtSchema(BaseModel):
    id: int
    student_id: str
    teacher_id: Optional[str] = None
    assignment_id: Optional[int] = None
    content: str
    response: Optional[str] = None
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DoubtResolve(BaseModel):
    response: str


class StudentProfileUpdate(BaseModel):
    class_name: str


class QuizQuestionSchema(BaseModel):
    id: int
    subject: str
    topic: str
    question_text: str
    difficulty: int
    type: str
    options: List[str]

    model_config = {"from_attributes": True}


class QuizAnswerSubmit(BaseModel):
    question_id: int
    answer_index: int


class QuizSubmission(BaseModel):
    subject: str
    answers: List[QuizAnswerSubmit]


