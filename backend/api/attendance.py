from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..schemas.schemas import AttendanceSessionCreate, AttendanceSessionSchema, AttendanceRecordSchema, AttendanceSummary, StudentProfileUpdate
from ..services.attendance_service import AttendanceService
from .auth import verify_token
from ..models.models import User

router = APIRouter()

@router.get("/classes")
def get_classes(db: Session = Depends(get_db), current_user: User = Depends(verify_token)):
    return AttendanceService.get_classes_list(db)

@router.get("/students")
def get_students(classId: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(verify_token)):
    return AttendanceService.get_students_list(db, class_id=classId)

@router.get("/student/summary")
def get_student_summary_route(db: Session = Depends(get_db), current_user: User = Depends(verify_token)):
    return AttendanceService.get_student_summary_full(db, current_user.id)

@router.post("/mark", response_model=AttendanceSessionSchema)
async def mark_attendance(data: AttendanceSessionCreate, db: Session = Depends(get_db)):
    return await AttendanceService.mark_attendance(db, data)

@router.get("/student/profile")
def get_student_profile(db: Session = Depends(get_db), current_user: User = Depends(verify_token)):
    from ..models.models import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            weak_subjects=[],
            study_time_preference="Morning",
            class_name="Class 11",
            elo=1200
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return {"class_name": profile.class_name}

@router.get("/student/{id}", response_model=List[AttendanceRecordSchema])
def get_student_attendance(id: str, db: Session = Depends(get_db)):
    return AttendanceService.get_student_attendance(db, id)

@router.get("/student/{id}/summary", response_model=AttendanceSummary)
def get_student_summary(id: str, db: Session = Depends(get_db)):
    return AttendanceService.get_student_summary(db, id)

@router.get("/class/{class_id}", response_model=List[AttendanceSessionSchema])
def get_class_attendance(class_id: str, db: Session = Depends(get_db)):
    return AttendanceService.get_class_attendance(db, class_id)

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    return AttendanceService.check_low_attendance(db)



@router.post("/student/profile")
def update_student_profile(
    data: StudentProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    from ..models.models import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        profile = StudentProfile(
            user_id=current_user.id,
            weak_subjects=[],
            study_time_preference="Morning",
            class_name=data.class_name,
            elo=1200
        )
        db.add(profile)
    else:
        profile.class_name = data.class_name
    db.commit()
    return {"class_name": profile.class_name}

