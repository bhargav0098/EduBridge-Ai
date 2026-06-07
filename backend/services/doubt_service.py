import asyncio
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from ..models.models import Doubt, User, ActivityLog, UserRole
from ..schemas.schemas import DoubtCreate
from ..utils.sse_manager import sse_manager

class DoubtService:
    @staticmethod
    async def create_doubt(db: Session, student_id: str, data: DoubtCreate):
        student = db.query(User).filter(User.id == student_id).first()
        if not student:
            raise ValueError("Student not found")

        doubt = Doubt(
            student_id=student_id,
            teacher_id=data.teacher_id,
            assignment_id=data.assignment_id,
            content=data.content,
            status="open"
        )
        db.add(doubt)
        db.flush()

        # Log activity for student
        log = ActivityLog(
            user_id=student_id,
            role="student",
            action_type="doubt_asked",
            metadata_json={"content_preview": data.content[:60], "assignment_id": data.assignment_id},
            related_id=str(doubt.id)
        )
        db.add(log)
        db.commit()
        db.refresh(doubt)

        # Broadcast SSE
        await sse_manager.broadcast({
            "event": "doubt_created",
            "doubt_id": doubt.id,
            "student_name": student.name,
            "content": doubt.content,
            "teacher_id": doubt.teacher_id
        })

        return doubt

    @staticmethod
    async def get_doubts_for_user(db: Session, user_id: str, role: UserRole):
        if role == UserRole.STUDENT:
            return db.query(Doubt).filter(Doubt.student_id == user_id).order_by(Doubt.created_at.desc()).all()
        else:
            # Teachers get all doubts or doubts addressed to them
            return db.query(Doubt).filter(
                (Doubt.teacher_id == user_id) | (Doubt.teacher_id == None)
            ).order_by(Doubt.created_at.desc()).all()

    @staticmethod
    async def resolve_doubt(db: Session, teacher_id: str, doubt_id: int, response: str):
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher:
            raise ValueError("Teacher not found")

        doubt = db.query(Doubt).filter(Doubt.id == doubt_id).first()
        if not doubt:
            raise ValueError("Doubt not found")

        doubt.response = response
        doubt.status = "resolved"
        doubt.resolved_at = func.now()
        doubt.teacher_id = teacher_id

        # Log activity for student
        student_log = ActivityLog(
            user_id=doubt.student_id,
            role="student",
            action_type="doubt_resolved",
            metadata_json={"resolved_by": teacher.name, "question": doubt.content[:60]},
            related_id=str(doubt.id)
        )
        db.add(student_log)

        # Log activity for teacher
        teacher_log = ActivityLog(
            user_id=teacher_id,
            role="teacher",
            action_type="doubt_resolved",
            metadata_json={"resolved_for": doubt.student.name if doubt.student else "Student"},
            related_id=str(doubt.id)
        )
        db.add(teacher_log)

        db.commit()
        db.refresh(doubt)

        # Broadcast SSE
        await sse_manager.broadcast({
            "event": "doubt_resolved",
            "doubt_id": doubt.id,
            "student_id": doubt.student_id,
            "resolved_by": teacher.name,
            "response": response
        })

        return doubt
