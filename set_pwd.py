from backend.database import SessionLocal
from backend.models.models import User, UserRole, StudentProfile
from backend.services.auth_service import AuthService
import uuid

db = SessionLocal()

# 1. Create/update teacher
teacher = db.query(User).filter(User.email == "diyamajee0391@gmail.com").first()
if not teacher:
    teacher = User(
        id=str(uuid.uuid4()),
        email="diyamajee0391@gmail.com",
        name="Diya Majee",
        hashed_password=AuthService.hash_password("password123"),
        role=UserRole.TEACHER
    )
    db.add(teacher)
    print("Teacher created successfully")
else:
    teacher.hashed_password = AuthService.hash_password("password123")
    print("Teacher password updated successfully")

# 2. Create/update student Dipshika
student = db.query(User).filter(User.email == "bhattacharyadipshika2@gmail.com").first()
if not student:
    student_id = str(uuid.uuid4())
    student = User(
        id=student_id,
        email="bhattacharyadipshika2@gmail.com",
        name="Dipshika Kumari",
        hashed_password=AuthService.hash_password("password123"),
        role=UserRole.STUDENT
    )
    db.add(student)
    db.flush()
    profile = StudentProfile(
        user_id=student_id,
        weak_subjects=[],
        study_time_preference="Morning",
        class_name="CS-3A",
        elo=1200
    )
    db.add(profile)
    print("Student Dipshika created successfully")
else:
    student.hashed_password = AuthService.hash_password("password123")
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == student.id).first()
    if profile:
        profile.class_name = "CS-3A"
    print("Student Dipshika updated successfully")

db.commit()
db.close()
