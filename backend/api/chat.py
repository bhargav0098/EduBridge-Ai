import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional, List

from ..database import get_db
from ..models.models import ChatSession, ChatMessage, User, UserRole
from ..schemas.schemas import ChatInput, ChatResponse
from ..services.rag_service import RAGService
from .auth import verify_token
from ..config import settings
from ..utils.limiter import limiter

import google.generativeai as genai

router = APIRouter()
security = HTTPBearer(auto_error=False)

def get_chat_user(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    if settings.DEBUG:
        if credentials:
            try:
                return verify_token(credentials, db)
            except Exception:
                pass
        
        # Fallback to dev user
        current_user = db.query(User).filter(User.email == "dev_user@edubridge.com").first()
        if not current_user:
            from ..models.models import UserRole, StudentProfile
            current_user = User(
                id="dev_user_id",
                email="dev_user@edubridge.com",
                name="Developer User",
                role=UserRole.STUDENT
            )
            db.add(current_user)
            db.commit()
            db.refresh(current_user)
            
            profile = StudentProfile(
                user_id=current_user.id,
                weak_subjects=[],
                study_time_preference="Morning",
                class_name="Class 11",
                elo=1200
            )
            db.add(profile)
            db.commit()
        return current_user
    else:
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return verify_token(credentials, db)

# Configure Gemini
try:
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    print(f"Failed to configure Gemini client: {e}")


def get_gemini_response_stream(prompt: str, system_instruction: str):
    """
    Call Gemini API and yield chunks.
    """
    try:
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            system_instruction=system_instruction
        )
        print(f"[Backend Chat] Sending Gemini request. Prompt preview: '{prompt[:50]}...'")
        response = model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text
        print("[Backend Chat] Gemini streaming response completed successfully.")
        return
    except Exception as e:
        error_msg = f"[Backend Chat] Gemini API streaming error: {e}"
        print(error_msg)
        yield f"AI service error: {e}"


@router.post("")
@limiter.limit("60/minute")
def chat_endpoint(
    request: Request,
    chat_input: ChatInput,
    stream: bool = Query(True, description="Whether to stream response via SSE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_chat_user)
):
    # 1. Resolve Session ID
    session_id = chat_input.session_id
    if not session_id:
        session_id = str(uuid.uuid4())

    # Check if session exists or create it
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        session = ChatSession(id=session_id, user_id=current_user.id)
        db.add(session)
        db.commit()

    # 2. Retrieve Context
    context_results = RAGService.retrieve_context(chat_input.message, k=4)
    context_text = "\n\n".join([r["text"] for r in context_results])
    sources = [r["metadata"].get("chunk_id", "unknown") for r in context_results]

    # Save User message to DB
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=chat_input.message,
        sources=None
    )
    db.add(user_msg)
    db.commit()

    # 3. Build prompts
    if current_user.role == UserRole.TEACHER:
        system_instruction = (
            f"You are an AI Teacher Assistant. Respond in {chat_input.language}. "
            f"Help the teacher create lesson plans, draft test questions, format class materials, and outline pedagogical suggestions. "
            f"Use the provided context when applicable, but you may use general pedagogical and academic knowledge to provide high-quality instructional advice. "
            f"Context:\n{context_text}"
        )
    else:
        system_instruction = (
            f"You are an NCERT tutor. Respond in {chat_input.language}. "
            f"Use only the provided NCERT context. Do not hallucinate or use external knowledge. "
            f"Context:\n{context_text}"
        )
    prompt = chat_input.message

    if stream:
        def sse_generator():
            full_reply = ""
            # Yield initial metadata
            yield f"data: {json.dumps({'event': 'start', 'session_id': session_id, 'sources': sources})}\n\n"
            
            # Yield chunks
            for text_chunk in get_gemini_response_stream(prompt, system_instruction):
                full_reply += text_chunk
                yield f"data: {json.dumps({'event': 'chunk', 'text': text_chunk})}\n\n"

            # Save Assistant message to DB
            try:
                # We open a new session in generator thread to prevent session closing issues
                inner_db = next(get_db())
                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=full_reply,
                    sources={"chunk_ids": sources}
                )
                inner_db.add(assistant_msg)
                inner_db.commit()
                inner_db.close()
            except Exception as ex:
                print(f"Error saving assistant message in SSE generator: {ex}")

            yield f"data: {json.dumps({'event': 'done', 'answer': full_reply})}\n\n"

        return StreamingResponse(sse_generator(), media_type="text/event-stream")

    else:
        # Non-streaming response
        reply_parts = []
        for text_chunk in get_gemini_response_stream(prompt, system_instruction):
            reply_parts.append(text_chunk)
        answer = "".join(reply_parts)

        # Save Assistant message to DB
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            sources={"chunk_ids": sources}
        )
        db.add(assistant_msg)
        db.commit()

        return ChatResponse(answer=answer, sources=sources, session_id=session_id)
