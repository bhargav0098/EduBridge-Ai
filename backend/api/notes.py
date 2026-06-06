from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
from ..database import get_db
from ..schemas.schemas import NoteCreate, NoteSchema
from ..services.note_service import NoteService

router = APIRouter()

UPLOAD_DIR = "uploads/notes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=NoteSchema)
async def upload_note(
    title: str = Form(...),
    content: Optional[str] = Form(None),
    tags: Optional[str] = Form(""), # Comma separated
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Mock user_id - In real app, get from JWT
    user_id = "demo_student_1" 
    
    file_path = None
    if file:
        safe_filename = os.path.basename(file.filename)
        file_path = os.path.join(UPLOAD_DIR, f"{user_id}_{safe_filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    tag_list = [t.strip() for t in tags.split(",") if t.strip()]
    note_data = NoteCreate(title=title, content=content, tags=tag_list)
    
    return NoteService.create_note(db, note_data, user_id, file_path)

@router.get("/", response_model=List[NoteSchema])
def get_notes(search: Optional[str] = None, db: Session = Depends(get_db)):
    return NoteService.get_notes(db, search=search)

@router.get("/my", response_model=List[NoteSchema])
def get_my_notes(db: Session = Depends(get_db)):
    user_id = "demo_student_1"
    return NoteService.get_user_notes(db, user_id)

@router.get("/feed", response_model=List[NoteSchema])
def get_feed(db: Session = Depends(get_db)):
    user_id = "demo_student_1"
    return NoteService.get_feed_notes(db, user_id)

@router.post("/{id}/share")
def share_note(id: int, target_user_id: str, db: Session = Depends(get_db)):
    return NoteService.share_note(db, id, target_user_id)

@router.delete("/{id}")
def delete_note(id: int, db: Session = Depends(get_db)):
    user_id = "demo_student_1"
    success = NoteService.delete_note(db, id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Note not found or not authorized")
    return {"message": "Note deleted"}
