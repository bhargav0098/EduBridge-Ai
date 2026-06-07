from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.models import User, UserRole
from ..schemas.schemas import (
    AssignmentCreate, AssignmentSchema,
    AssignmentSubmissionSchema, AssignmentSubmissionCreate,
    AssignmentSubmissionGrade
)
from ..services.assignment_service import AssignmentService
from .auth import verify_token, RoleChecker

router = APIRouter()

@router.post("/", response_model=AssignmentSchema, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    data: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    try:
        return await AssignmentService.create_assignment(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/student", response_model=List[AssignmentSubmissionSchema])
async def get_assignments_for_student(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.STUDENT]))
):
    return await AssignmentService.get_assignments_for_student(db, current_user.id)

@router.get("/submissions", response_model=List[AssignmentSubmissionSchema])
async def get_teacher_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    from ..models.models import AssignmentSubmission, Assignment
    return db.query(AssignmentSubmission).join(Assignment).filter(
        Assignment.teacher_id == current_user.id
    ).all()

@router.get("/assignment/{assignment_id}/submissions", response_model=List[AssignmentSubmissionSchema])
async def get_submissions_for_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    return await AssignmentService.get_submissions_for_assignment(db, assignment_id)

@router.post("/submit/{submission_id}", response_model=AssignmentSubmissionSchema)
async def submit_assignment(
    submission_id: int,
    data: AssignmentSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.STUDENT]))
):
    try:
        return await AssignmentService.submit_assignment(db, current_user.id, submission_id, data.submission_content)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/grade/{submission_id}", response_model=AssignmentSubmissionSchema)
async def grade_submission(
    submission_id: int,
    data: AssignmentSubmissionGrade,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    try:
        return await AssignmentService.grade_submission(db, current_user.id, submission_id, data.grade, data.feedback)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
