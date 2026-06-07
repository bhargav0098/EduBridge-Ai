from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import AttendanceSession, AttendanceRecord, LowAttendanceAlert, User, Notification, ActivityLog, Achievement, StudentProfile, StudentPerformance
from ..schemas.schemas import AttendanceSessionCreate, AttendanceSummary
from datetime import datetime
from ..utils.sse_manager import sse_manager

class AttendanceService:
    @staticmethod
    async def mark_attendance(db: Session, data: AttendanceSessionCreate):
        session = AttendanceSession(
            class_id=data.class_id,
            teacher_id=data.teacher_id,
            date=datetime.now()
        )
        db.add(session)
        db.flush()

        # Log activity for teacher
        teacher_log = ActivityLog(
            user_id=data.teacher_id,
            role="teacher",
            action_type="attendance_marked",
            metadata_json={"class_id": data.class_id, "students_count": len(data.records)},
            related_id=str(session.id)
        )
        db.add(teacher_log)
        
        for record_data in data.records:
            record = AttendanceRecord(
                session_id=session.id,
                student_id=record_data.student_id,
                status=record_data.status
            )
            db.add(record)
            db.flush() # flush so summary gets correct counts
            
            # Log activity for student
            student_log = ActivityLog(
                user_id=record_data.student_id,
                role="student",
                action_type="attendance_marked",
                metadata_json={"status": record_data.status, "class_id": data.class_id},
                related_id=str(session.id)
            )
            db.add(student_log)
            db.flush()

            # Award "Perfect Presence" achievement if eligible
            summary = AttendanceService.get_student_summary(db, record_data.student_id)
            if summary.attendance_percentage == 100.0 and summary.total_sessions >= 5:
                existing_badge = db.query(Achievement).filter(
                    Achievement.user_id == record_data.student_id,
                    Achievement.badge_name == "Perfect Presence"
                ).first()
                if not existing_badge:
                    badge = Achievement(
                        user_id=record_data.student_id,
                        badge_name="Perfect Presence",
                        description="Maintained a perfect 100% attendance record over at least 5 sessions!",
                        points=100
                    )
                    db.add(badge)
        
        db.commit()
        db.refresh(session)

        # Broadcast update
        await sse_manager.broadcast({
            "event": "attendance_marked",
            "class_id": data.class_id,
            "teacher_id": data.teacher_id
        })

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
    def get_classes_list(db: Session):
        from ..models.models import CourseClass
        classes = db.query(CourseClass).all()
        
        results = []
        for cls in classes:
            student_count = db.query(User).join(StudentProfile).filter(
                StudentProfile.class_name.like(f"%{cls.name}%"),
                User.role == "student"
            ).count()

            sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == cls.id).all()
            session_ids = [s.id for s in sessions]
            
            attendance_rate = 100.0
            if session_ids:
                total_records = db.query(AttendanceRecord).filter(AttendanceRecord.session_id.in_(session_ids)).count()
                present_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.session_id.in_(session_ids),
                    AttendanceRecord.status == "present"
                ).count()
                if total_records > 0:
                    attendance_rate = (present_records / total_records) * 100

            results.append({
                "id": cls.id,
                "name": cls.name,
                "subject": cls.subject,
                "studentCount": student_count,
                "schedule": cls.schedule,
                "attendanceRate": round(attendance_rate, 1)
            })
        return results

    @staticmethod
    def get_students_list(db: Session, class_id: str = None):
        from ..models.models import CourseClass
        
        query = db.query(User).join(StudentProfile).filter(User.role == "student")
        
        if class_id:
            course = db.query(CourseClass).filter(CourseClass.id == class_id).first()
            if course:
                query = query.filter(StudentProfile.class_name.like(f"%{course.name}%"))
            
        students = query.all()
        results = []
        
        for student in students:
            session_query = db.query(AttendanceSession)
            if class_id:
                session_query = session_query.filter(AttendanceSession.class_id == class_id)
            sessions = session_query.all()
            session_ids = [s.id for s in sessions]
            
            attendance_rate = 0.0
            status = "Absent"
            history = []
            
            if session_ids:
                total_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.session_id.in_(session_ids)
                ).count()
                
                present_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.session_id.in_(session_ids),
                    AttendanceRecord.status == "present"
                ).count()
                
                if total_records > 0:
                    attendance_rate = round((present_records / total_records) * 100, 1)
                
                last_record = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.session_id.in_(session_ids)
                ).join(AttendanceSession).order_by(AttendanceSession.date.desc()).first()
                
                if last_record:
                    status = "Present" if last_record.status == "present" else "Absent"

                records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.session_id.in_(session_ids)
                ).join(AttendanceSession).order_by(AttendanceSession.date.asc()).all()
                
                for r in records:
                    history.append({
                        "date": r.session.date.strftime("%Y-%m-%d"),
                        "status": "Present" if r.status == "present" else "Absent"
                    })
            
            quiz_attempts = db.query(StudentPerformance).filter(StudentPerformance.student_id == student.id).all()
            if quiz_attempts:
                correct = sum(1 for q in quiz_attempts if q.correct)
                quiz_performance = round((correct / len(quiz_attempts)) * 100)
            else:
                quiz_performance = 0

            notes_count = 0
            
            results.append({
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "attendanceRate": attendance_rate,
                "status": status,
                "history": history,
                "quizPerformance": quiz_performance,
                "notesActivityCount": notes_count
            })
            
        return results

    @staticmethod
    def get_student_summary_full(db: Session, student_id: str):
        sessions = db.query(AttendanceSession).all()
        session_ids = [s.id for s in sessions]
        
        overall_rate = 0.0
        history = []
        history_map = {}
        
        if session_ids:
            records = db.query(AttendanceRecord).filter(
                AttendanceRecord.student_id == student_id,
                AttendanceRecord.session_id.in_(session_ids)
            ).join(AttendanceSession).all()
            for r in records:
                history_map[r.session.date.strftime("%Y-%m-%d")] = "Present" if r.status == "present" else "Absent"
                
            total_records = len(records)
            present_records = sum(1 for r in records if r.status == "present")
            if total_records > 0:
                overall_rate = round((present_records / total_records) * 100, 1)

        from datetime import datetime, timedelta
        base_date = datetime.now()
        for i in range(30, -1, -1):
            d = base_date - timedelta(days=i)
            date_str = d.strftime("%Y-%m-%d")
            
            if date_str in history_map:
                history.append({"date": date_str, "status": history_map[date_str]})
                    
        from ..models.models import CourseClass
        classes = db.query(CourseClass).all()
        
        subject_wise = []
        for cls in classes:
            cls_sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == cls.id).all()
            cls_session_ids = [s.id for s in cls_sessions]
            
            total = 0
            present = 0
            rate = 0.0
            
            if cls_session_ids:
                total = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.session_id.in_(cls_session_ids)
                ).count()
                present = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student_id,
                    AttendanceRecord.session_id.in_(cls_session_ids),
                    AttendanceRecord.status == "present"
                ).count()
                
            if total > 0:
                rate = round((present / total) * 100, 1)
                
            subject_wise.append({
                "subject": cls.subject,
                "attendanceRate": rate,
                "totalClasses": total,
                "presentClasses": present,
                "absentClasses": total - present
            })
            
        return {
            "overallRate": overall_rate,
            "history": history,
            "subjectWise": subject_wise
        }

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
