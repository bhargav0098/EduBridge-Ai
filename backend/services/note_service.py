from sqlalchemy.orm import Session
from ..models.models import Note, NoteTag, NoteShare
from ..schemas.schemas import NoteCreate
from typing import List, Optional
import os

class NoteService:
    @staticmethod
    def create_note(db: Session, note_data: NoteCreate, owner_id: str, file_path: Optional[str] = None):
        note = Note(
            title=note_data.title,
            content=note_data.content,
            owner_id=owner_id,
            file_path=file_path
        )
        db.add(note)
        db.flush()
        
        for tag_str in note_data.tags:
            tag = NoteTag(note_id=note.id, tag=tag_str)
            db.add(tag)
        
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def get_notes(db: Session, skip: int = 0, limit: int = 100, search: Optional[str] = None):
        query = db.query(Note)
        if search:
            query = query.filter(
                (Note.title.ilike(f"%{search}%")) | 
                (Note.content.ilike(f"%{search}%"))
            )
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_user_notes(db: Session, user_id: str):
        return db.query(Note).filter(Note.owner_id == user_id).all()

    @staticmethod
    def get_feed_notes(db: Session, user_id: str):
        # Notes owned by user + notes shared with user
        shared_note_ids = db.query(NoteShare.note_id).filter(NoteShare.user_id == user_id).all()
        shared_note_ids = [id_tuple[0] for id_tuple in shared_note_ids]
        
        return db.query(Note).filter(
            (Note.owner_id == user_id) | (Note.id.in_(shared_note_ids))
        ).order_by(Note.created_at.desc()).all()

    @staticmethod
    def share_note(db: Session, note_id: int, user_id: str):
        share = NoteShare(note_id=note_id, user_id=user_id)
        db.add(share)
        db.commit()
        return share

    @staticmethod
    def delete_note(db: Session, note_id: int, user_id: str):
        note = db.query(Note).filter(Note.id == note_id, Note.owner_id == user_id).first()
        if note:
            db.delete(note)
            db.commit()
            return True
        return False
