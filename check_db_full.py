from backend.database import SessionLocal
from backend.models.models import User, ActivityLog, AttendanceSession, AttendanceRecord, Doubt, Assignment, AssignmentSubmission, StudentProfile
from sqlalchemy import inspect

db = SessionLocal()
inspector = inspect(db.bind)

print("Tables in database:", inspector.get_table_names())

print("\n--- Users ---")
for u in db.query(User).all():
    print(f"ID: {u.id}, Name: {u.name}, Email: {u.email}, Role: {u.role}")

print("\n--- Student Profiles ---")
for p in db.query(StudentProfile).all():
    print(f"User ID: {p.user_id}, Class: {p.class_name}")

print("\n--- Activity Logs ---")
for log in db.query(ActivityLog).all():
    print(f"Log ID: {log.id}, User ID: {log.user_id}, Action: {log.action_type}, Timestamp: {log.timestamp}, Metadata: {log.metadata_json}")

print("\n--- Attendance Sessions ---")
for sess in db.query(AttendanceSession).all():
    print(f"Session ID: {sess.id}, Class: {sess.class_id}, Date: {sess.date}")

print("\n--- Attendance Records ---")
for rec in db.query(AttendanceRecord).all():
    print(f"Record ID: {rec.id}, Session ID: {rec.session_id}, Student ID: {rec.student_id}, Status: {rec.status}")

print("\n--- Doubts ---")
for d in db.query(Doubt).all():
    print(f"Doubt ID: {d.id}, Student: {d.student_id}, Content: {d.content}, Status: {d.status}")

print("\n--- Assignments ---")
for a in db.query(Assignment).all():
    print(f"Assignment ID: {a.id}, Title: {a.title}, Class: {a.class_id}")

print("\n--- Submissions ---")
for s in db.query(AssignmentSubmission).all():
    print(f"Submission ID: {s.id}, Assignment ID: {s.assignment_id}, Student ID: {s.student_id}, Status: {s.status}")

db.close()
