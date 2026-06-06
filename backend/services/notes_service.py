from sqlalchemy.orm import Session
from sqlalchemy import or_
from ..models.models import Note, NoteTag, NoteShare
from ..schemas.schemas import NoteCreate
import os
import shutil

class NotesService:
    @staticmethod
    def upload_note(db: Session, owner_id: str, title: str, content: str = None, file_path: str = None, tags: list = []):
        note = Note(
            title=title,
            content=content,
            file_path=file_path,
            owner_id=owner_id
        )
        db.add(note)
        db.flush()
        
        for tag_name in tags:
            tag = NoteTag(note_id=note.id, tag=tag_name)
            db.add(tag)
            
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def get_notes(db: Session, skip: int = 0, limit: int = 10, search: str = None):
        query = db.query(Note)
        if search:
            query = query.filter(
                or_(
                    Note.title.ilike(f"%{search}%"),
                    Note.content.ilike(f"%{search}%")
                )
            )
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_my_notes(db: Session, user_id: str):
        return db.query(Note).filter(Note.owner_id == user_id).all()

    @staticmethod
    def get_note_feed(db: Session, user_id: str):
        # Feed includes user's notes and notes shared with them
        shared_note_ids = db.query(NoteShare.note_id).filter(NoteShare.user_id == user_id).all()
        shared_note_ids = [id[0] for id in shared_note_ids]
        
        return db.query(Note).filter(
            or_(
                Note.owner_id == user_id,
                Note.id.in_(shared_note_ids)
            )
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
