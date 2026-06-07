from sqlalchemy.orm import Session
from sqlalchemy import func
from ..models.models import ActivityLog, Achievement, StudentPerformance, AssignmentSubmission, Assignment, Doubt, User, StudentProfile, UserRole
from .attendance_service import AttendanceService

class DashboardService:
    @staticmethod
    def get_timeline(db: Session, user_id: str = None, role: str = None, limit: int = 30):
        query = db.query(ActivityLog)
        if user_id:
            query = query.filter(ActivityLog.user_id == user_id)
        if role:
            query = query.filter(ActivityLog.role == role)
        
        # We also want to include user names in the timeline so we can show "Priya completed..."
        # Let's join with User
        logs = query.join(User).order_by(ActivityLog.timestamp.desc()).limit(limit).all()
        
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "user_id": log.user_id,
                "user_name": log.user.name,
                "role": log.role,
                "action_type": log.action_type,
                "timestamp": log.timestamp,
                "metadata_json": log.metadata_json,
                "related_id": log.related_id
            })
        return result

    @staticmethod
    def get_student_stats(db: Session, student_id: str):
        # 1. Attendance %
        attendance_summary = AttendanceService.get_student_summary(db, student_id)
        
        # 2. Quiz Performance
        total_quiz_attempts = db.query(StudentPerformance).filter(
            StudentPerformance.student_id == student_id
        ).count()
        correct_quiz_attempts = db.query(StudentPerformance).filter(
            StudentPerformance.student_id == student_id,
            StudentPerformance.correct == True
        ).count()
        quiz_accuracy = (correct_quiz_attempts / total_quiz_attempts * 100) if total_quiz_attempts > 0 else 0.0

        # 3. Assignment Completion
        total_assignments = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id
        ).count()
        completed_assignments = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id,
            AssignmentSubmission.status.in_(["submitted", "graded"])
        ).count()

        # 4. Achievements Count
        achievements = db.query(Achievement).filter(
            Achievement.user_id == student_id
        ).all()
        achievement_count = len(achievements)

        # 5. Streak (consecutive correct quiz questions, or mock if none)
        # Let's calculate the real streak of consecutive correct answers from last attempts
        recent_attempts = db.query(StudentPerformance).filter(
            StudentPerformance.student_id == student_id
        ).order_by(StudentPerformance.attempt_time.desc()).limit(10).all()
        
        streak = 0
        for attempt in recent_attempts:
            if attempt.correct:
                streak += 1
            else:
                break

        return {
            "attendance_percentage": attendance_summary.attendance_percentage,
            "total_sessions": attendance_summary.total_sessions,
            "present_count": attendance_summary.present_count,
            "quiz_accuracy": round(quiz_accuracy, 2),
            "quiz_attempts": total_quiz_attempts,
            "quiz_correct": correct_quiz_attempts,
            "total_assignments": total_assignments,
            "completed_assignments": completed_assignments,
            "achievement_count": achievement_count,
            "streak": streak,
            "achievements": [
                {
                    "badge_name": ach.badge_name,
                    "description": ach.description,
                    "points": ach.points,
                    "earned_at": ach.earned_at
                }
                for ach in achievements
            ]
        }

    @staticmethod
    def get_teacher_stats(db: Session, teacher_id: str):
        # 1. Total assignments created by this teacher
        total_assignments = db.query(Assignment).filter(
            Assignment.teacher_id == teacher_id
        ).count()

        # 2. Total pending submissions to grade (assignments from this teacher that are "submitted")
        pending_grading = db.query(AssignmentSubmission).join(Assignment).filter(
            Assignment.teacher_id == teacher_id,
            AssignmentSubmission.status == "submitted"
        ).count()

        # 3. Total open doubts
        open_doubts = db.query(Doubt).filter(
            (Doubt.teacher_id == teacher_id) | (Doubt.teacher_id == None),
            Doubt.status == "open"
        ).count()

        # 4. Total students in classes taught by teacher
        # Let's see classes where teacher has made assignments or marked attendance
        classes_with_assignments = db.query(Assignment.class_id).filter(
            Assignment.teacher_id == teacher_id
        ).distinct().all()
        class_ids = [c[0] for c in classes_with_assignments]
        
        # Let's query student count in these classes
        total_students = 0
        if class_ids:
            students = db.query(User).join(StudentProfile).filter(User.role == UserRole.STUDENT).all()
            for s in students:
                s_classes = [c.strip() for c in s.student_profile.class_name.split(",")] if s.student_profile and s.student_profile.class_name else []
                if any(c in class_ids for c in s_classes):
                    total_students += 1
        else:
            total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()

        return {
            "total_assignments_created": total_assignments,
            "pending_grading": pending_grading,
            "open_doubts": open_doubts,
            "total_students": total_students
        }
