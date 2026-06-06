import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from ..database import get_db
from ..models.models import ChatSession, ChatMessage, User
from ..schemas.schemas import ChatInput, ChatResponse
from ..services.rag_service import RAGService
from .auth import verify_token
from ..config import settings
from ..utils.limiter import limiter

import google.generativeai as genai

router = APIRouter()

# Configure Gemini
try:
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_gemini_key_for_now":
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception as e:
    print(f"Failed to configure Gemini client: {e}")


def get_gemini_response_stream(prompt: str, system_instruction: str):
    """
    Call Gemini API and yield chunks. Falls back to mock generator if API key is not configured or fails.
    """
    use_real = False
    try:
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_gemini_key_for_now":
            use_real = True
    except Exception:
        pass

    if use_real:
        try:
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_instruction
            )
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
            return
        except Exception as e:
            print(f"Gemini API streaming error: {e}. Falling back to mock tutor.")

    # Fallback / Mock Tutor Response based on prompt/system_instruction
    mock_tutor_response = f"I am your NCERT tutor. Based on the textbook context, here is what we know: "
    if "Newton" in prompt or "Newton" in system_instruction:
        mock_tutor_response += "Newton's laws describe motion. First Law is Inertia, Second Law is F=ma, and Third Law is action-reaction."
    elif "Kinetics" in prompt or "Kinetics" in system_instruction:
        mock_tutor_response += "Chemical Kinetics studies reaction rates, mechanisms, and factors like concentration/temperature."
    elif "Calculus" in prompt or "Calculus" in system_instruction or "Derivative" in prompt:
        mock_tutor_response += "In calculus, the derivative measures instantaneous rate of change. The derivative of x^n is n * x^(n-1)."
    else:
        mock_tutor_response += "Let's review the NCERT textbook details provided. Please make sure to read the chapter carefully."

    # Yield word by word to simulate streaming
    for word in mock_tutor_response.split(" "):
        yield word + " "


@router.post("")
@limiter.limit("60/minute")
def chat_endpoint(
    request: Request,
    chat_input: ChatInput,
    stream: bool = Query(True, description="Whether to stream response via SSE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
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
