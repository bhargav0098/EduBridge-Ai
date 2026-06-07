from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models.models import User, UserRole
from ..schemas.schemas import DoubtCreate, DoubtSchema, DoubtResolve
from ..services.doubt_service import DoubtService
from .auth import verify_token, RoleChecker

router = APIRouter()

@router.post("/", response_model=DoubtSchema, status_code=status.HTTP_201_CREATED)
async def create_doubt(
    data: DoubtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.STUDENT]))
):
    try:
        return await DoubtService.create_doubt(db, current_user.id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[DoubtSchema])
async def get_doubts(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    return await DoubtService.get_doubts_for_user(db, current_user.id, current_user.role)

@router.post("/resolve/{doubt_id}", response_model=DoubtSchema)
async def resolve_doubt(
    doubt_id: int,
    data: DoubtResolve,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.TEACHER, UserRole.ADMIN]))
):
    try:
        return await DoubtService.resolve_doubt(db, current_user.id, doubt_id, data.response)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
