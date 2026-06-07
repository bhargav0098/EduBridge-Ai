import asyncio
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime
from ..models.models import User, StudentProfile, Assignment, AssignmentSubmission, ActivityLog, Achievement, UserRole
from ..schemas.schemas import AssignmentCreate
from ..utils.sse_manager import sse_manager

class AssignmentService:
    @staticmethod
    async def create_assignment(db: Session, teacher_id: str, data: AssignmentCreate):
        # 1. Fetch teacher info
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher:
            raise ValueError("Teacher not found")

        # 2. Create Assignment
        assignment = Assignment(
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            class_id=data.class_id,
            teacher_id=teacher_id
        )
        db.add(assignment)
        db.flush()

        # 3. Get students in the specified class name
        students = db.query(User).join(StudentProfile).filter(
            StudentProfile.class_name.like(f"%{data.class_id}%"),
            User.role == UserRole.STUDENT
        ).all()

        # 4. Create Submissions and Activity logs for students
        for student in students:
            submission = AssignmentSubmission(
                assignment_id=assignment.id,
                student_id=student.id,
                status="assigned"
            )
            db.add(submission)
            
            # Log activity for the student
            student_log = ActivityLog(
                user_id=student.id,
                role="student",
                action_type="assignment_assigned",
                metadata_json={"assignment_title": data.title, "due_date": str(data.due_date)},
                related_id=str(assignment.id)
            )
            db.add(student_log)

        # 5. Log activity for the teacher
        teacher_log = ActivityLog(
            user_id=teacher_id,
            role="teacher",
            action_type="assignment_created",
            metadata_json={"assignment_title": data.title, "class_id": data.class_id},
            related_id=str(assignment.id)
        )
        db.add(teacher_log)

        db.commit()
        db.refresh(assignment)

        # 6. Broadcast via SSE
        await sse_manager.broadcast({
            "event": "assignment_created",
            "class_id": data.class_id,
            "title": data.title,
            "teacher_name": teacher.name
        })

        return assignment

    @staticmethod
    async def get_assignments_for_student(db: Session, student_id: str):
        return db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id
        ).join(Assignment).all()

    @staticmethod
    async def get_submissions_for_assignment(db: Session, assignment_id: int):
        return db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == assignment_id
        ).all()

    @staticmethod
    async def submit_assignment(db: Session, student_id: str, submission_id: int, content: str):
        submission = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.id == submission_id,
            AssignmentSubmission.student_id == student_id
        ).first()

        if not submission:
            raise ValueError("Submission not found or unauthorized")

        submission.submission_content = content
        submission.status = "submitted"
        submission.submitted_at = func.now()

        # Log activity
        log = ActivityLog(
            user_id=student_id,
            role="student",
            action_type="assignment_submitted",
            metadata_json={"assignment_title": submission.assignment.title},
            related_id=str(submission.assignment_id)
        )
        db.add(log)

        # Award points / badge check if they did it early?
        # For simplicity, log points and commit
        db.commit()
        db.refresh(submission)

        student = db.query(User).filter(User.id == student_id).first()

        # Broadcast update
        await sse_manager.broadcast({
            "event": "assignment_submitted",
            "student_name": student.name if student else "A student",
            "title": submission.assignment.title,
            "assignment_id": submission.assignment_id
        })

        return submission

    @staticmethod
    async def grade_submission(db: Session, teacher_id: str, submission_id: int, grade: str, feedback: str):
        submission = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.id == submission_id
        ).first()

        if not submission:
            raise ValueError("Submission not found")

        # Verify teacher is the creator of the assignment
        if submission.assignment.teacher_id != teacher_id:
            raise ValueError("Unauthorized to grade this assignment")

        submission.grade = grade
        submission.feedback = feedback
        submission.status = "graded"

        # Log activity for student
        log = ActivityLog(
            user_id=submission.student_id,
            role="student",
            action_type="assignment_graded",
            metadata_json={"assignment_title": submission.assignment.title, "grade": grade},
            related_id=str(submission.assignment_id)
        )
        db.add(log)

        # Check if student qualifies for a "Top Graded" badge (e.g. A, A+, A-, 90+)
        is_top_grade = grade.upper() in ["A", "A+", "A-", "EXCELLENT", "100", "95", "90"]
        if is_top_grade:
            # Check if badge already exists
            existing_badge = db.query(Achievement).filter(
                Achievement.user_id == submission.student_id,
                Achievement.badge_name == "Academic Star"
            ).first()
            if not existing_badge:
                badge = Achievement(
                    user_id=submission.student_id,
                    badge_name="Academic Star",
                    description=f"Received a top grade ({grade}) in assignment: '{submission.assignment.title}'",
                    points=50
                )
                db.add(badge)

        db.commit()
        db.refresh(submission)

        # Broadcast update
        await sse_manager.broadcast({
            "event": "assignment_graded",
            "student_id": submission.student_id,
            "grade": grade,
            "title": submission.assignment.title
        })

        return submission
