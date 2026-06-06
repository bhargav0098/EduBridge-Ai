from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.schemas import AttendanceSessionCreate, AttendanceSessionSchema, AttendanceRecordSchema, AttendanceSummary
from ..services.attendance_service import AttendanceService

router = APIRouter()

@router.post("/mark", response_model=AttendanceSessionSchema)
def mark_attendance(data: AttendanceSessionCreate, db: Session = Depends(get_db)):
    return AttendanceService.mark_attendance(db, data)

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
