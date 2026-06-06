import os
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from langdetect import detect
from openai import OpenAI

from ..database import get_db
from ..models.models import User
from ..config import settings
from .auth import verify_token
from .chat import chat_endpoint
from ..schemas.schemas import ChatInput

router = APIRouter()

try:
    openai_client = None
    if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "mock_openai_key_for_now":
        openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
except Exception as e:
    print(f"Failed to initialize OpenAI client: {e}")


@router.post("")
@router.post("/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    session_id: Optional[str] = Form(None),
    chain_to_chat: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_token)
):
    # 1. Save uploaded file temporarily for Whisper
    temp_dir = "temp"
    os.makedirs(temp_dir, exist_ok=True)
    safe_filename = os.path.basename(file.filename)
    temp_file_path = os.path.join(temp_dir, f"{current_user.id}_{safe_filename}")

    try:
        with open(temp_file_path, "wb") as f:
            f.write(await file.read())

        transcript = ""
        detected_language = language or "en"

        # 2. Transcribe using OpenAI Whisper if configured
        if openai_client:
            try:
                with open(temp_file_path, "rb") as audio_file:
                    transcription = openai_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file
                    )
                    transcript = transcription.text
            except Exception as e:
                print(f"OpenAI Whisper error: {e}. Falling back to mock transcription.")
                transcript = "This is a mock transcription of physics questions about Newton's second law of motion."
        else:
            # Mock transcription fallback
            # Simulate Santali stub if Santali is requested
            if language == "Santali" or "santali" in safe_filename.lower():
                transcript = "Santali mock transcription: Nehel hukum reak' dosar niyam leme."
                detected_language = "sat"
            else:
                transcript = "Explain Newton's second law of motion with F = ma."
                detected_language = "en"

        # 3. Detect language if not provided
        if not language and transcript and detected_language != "sat":
            try:
                detected_language = detect(transcript)
            except Exception:
                detected_language = "en"

        # 4. Chain speech to chat endpoint if requested
        if chain_to_chat:
            chat_in = ChatInput(
                message=transcript,
                language="Hindi" if detected_language == "hi" else "Santali" if detected_language == "sat" else "English",
                session_id=session_id
            )
            # Invoke chat endpoint synchronously with stream=False to return the complete answer
            chat_res = chat_endpoint(
                chat_input=chat_in,
                stream=False,
                db=db,
                current_user=current_user
            )
            return {
                "transcript": transcript,
                "detected_language": detected_language,
                "chat_response": chat_res
            }

        return {
            "transcript": transcript,
            "detected_language": detected_language
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech processing failed: {str(e)}"
        )
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass
