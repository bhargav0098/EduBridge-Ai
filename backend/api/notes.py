from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
from ..database import get_db
from ..models.models import User
from ..schemas.schemas import NoteCreate, NoteSchema
from ..services.note_service import NoteService
from .auth import verify_token
from ..config import settings

router = APIRouter()
security = HTTPBearer(auto_error=False)

UPLOAD_DIR = "uploads/notes"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_note_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get current user; in DEBUG mode fall back to dev user if unauthenticated."""
    if credentials:
        try:
            return verify_token(credentials, db)
        except Exception:
            pass

    if settings.DEBUG:
        user = db.query(User).filter(User.email == "dev_user@edubridge.com").first()
        if user:
            return user
        from ..models.models import UserRole, StudentProfile
        import uuid
        user = User(
            id=str(uuid.uuid4()),
            email="dev_user@edubridge.com",
            name="Developer User",
            role=UserRole.STUDENT,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        profile = StudentProfile(user_id=user.id, weak_subjects=[], study_time_preference="Morning", class_name="Class 11", elo=1200)
        db.add(profile)
        db.commit()
        return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


@router.post("/upload", response_model=NoteSchema)
async def upload_note(
    title: str = Form(...),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    file_path = None
    if file:
        # Sanitize filename
        safe_name = os.path.basename(file.filename or "upload")
        file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{safe_name}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    tag_list = [t.strip() for t in (tags or "").split(",") if t.strip()]
    note_data = NoteCreate(title=title, content=content, tags=tag_list)
    return NoteService.create_note(db, note_data, current_user.id, file_path)


@router.get("/", response_model=List[NoteSchema])
def get_notes(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    return NoteService.get_notes(db, search=search)


@router.get("/my", response_model=List[NoteSchema])
def get_my_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    return NoteService.get_user_notes(db, current_user.id)


@router.get("/feed", response_model=List[NoteSchema])
def get_feed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    return NoteService.get_feed_notes(db, current_user.id)


@router.get("/wiki/search", response_model=List[NoteSchema])
def search_wiki(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    return NoteService.get_notes(db, search=search, sort_by_upvotes=True)


@router.post("/{id}/upvote")
def upvote_note(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    from ..models.models import Note
    note = db.query(Note).filter(Note.id == id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return NoteService.upvote_note(db, id, current_user.id)


@router.post("/{id}/share")
def share_note(
    id: int,
    target_user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    return NoteService.share_note(db, id, target_user_id)


@router.delete("/{id}")
def delete_note(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_note_user),
):
    success = NoteService.delete_note(db, id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found or not authorized")
    return {"message": "Note deleted successfully"}
