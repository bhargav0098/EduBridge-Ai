from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import AttendanceSession, AttendanceRecord, LowAttendanceAlert, User, Notification
from ..schemas.schemas import AttendanceSessionCreate, AttendanceSummary
from datetime import datetime

class AttendanceService:
    @staticmethod
    def mark_attendance(db: Session, data: AttendanceSessionCreate):
        session = AttendanceSession(
            class_id=data.class_id,
            teacher_id=data.teacher_id,
            date=datetime.now()
        )
        db.add(session)
        db.flush()
        
        for record_data in data.records:
            record = AttendanceRecord(
                session_id=session.id,
                student_id=record_data.student_id,
                status=record_data.status
            )
            db.add(record)
        
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_student_attendance(db: Session, student_id: str):
        return db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).all()

    @staticmethod
    def get_student_summary(db: Session, student_id: str):
        total_sessions = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).count()
        present_count = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == student_id,
            AttendanceRecord.status == "present"
        ).count()
        
        percentage = (present_count / total_sessions * 100) if total_sessions > 0 else 100.0
        
        return AttendanceSummary(
            student_id=student_id,
            total_sessions=total_sessions,
            present_count=present_count,
            attendance_percentage=round(percentage, 2)
        )

    @staticmethod
    def get_class_attendance(db: Session, class_id: str):
        return db.query(AttendanceSession).filter(AttendanceSession.class_id == class_id).all()

    @staticmethod
    def check_low_attendance(db: Session):
        students = db.query(User).filter(User.role == "student").all()
        alerts = []
        for student in students:
            summary = AttendanceService.get_student_summary(db, student.id)
            if summary.attendance_percentage < 75 and summary.total_sessions > 5:
                # Create alert if not already exists or if it's been a while
                alert = LowAttendanceAlert(
                    student_id=student.id,
                    percentage=summary.attendance_percentage
                )
                db.add(alert)
                
                # Create notification
                notification = Notification(
                    user_id=student.id,
                    title="Low Attendance Alert",
                    message=f"Your attendance is currently {summary.attendance_percentage}%, which is below the required 75%.",
                    type="attendance"
                )
                db.add(notification)
                alerts.append(alert)
        db.commit()
        return alerts
