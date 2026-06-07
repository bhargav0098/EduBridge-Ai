from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from functools import wraps
import secrets
import time

from ..database import get_db
from ..models.models import User, UserRole, StudentProfile, OTPRequest
from ..schemas.schemas import UserRegister, UserLogin, TokenSchema, UserSchema, PasswordResetRequest, PasswordResetVerify, AuthResponseSchema
from ..services.auth_service import AuthService
from ..services.email_service import EmailService
import random
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()
security = HTTPBearer(auto_error=False)


def verify_token(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
):
    token = None
    if credentials:
        token = credentials.credentials
    else:
        token = request.query_params.get("token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def token_required(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        return await func(*args, **kwargs)
    return wrapper


class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(verify_token)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted for this role")
        return current_user


@router.post("/register", response_model=AuthResponseSchema, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    normalized_email = user_data.email.strip().lower()
    logger.info(f"REGISTER ATTEMPT: {normalized_email}")

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if len(user_data.password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters")

    hashed_pw = AuthService.hash_password(user_data.password)
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=normalized_email,
        name=user_data.name.strip(),
        hashed_password=hashed_pw,
        role=user_data.role or UserRole.STUDENT,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if new_user.role == UserRole.STUDENT:
        profile = StudentProfile(
            user_id=new_user.id,
            weak_subjects=[],
            study_time_preference="Morning",
            class_name="Class 11",
            elo=1200,
        )
        db.add(profile)
        db.commit()

    access_token_expiry = timedelta(days=30) if user_data.remember else timedelta(minutes=30)
    refresh_token_expiry = timedelta(days=30) if user_data.remember else timedelta(days=7)

    access_token = AuthService.create_access_token(
        data={"sub": new_user.email, "uid": new_user.id, "role": new_user.role.value},
        expires_delta=access_token_expiry
    )
    refresh_token = AuthService.create_refresh_token(
        data={"sub": new_user.email},
        expires_delta=refresh_token_expiry
    )
    logger.info(f"USER CREATED: {user_id}")

    return AuthResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserSchema.model_validate(new_user),
    )


@router.post("/login", response_model=AuthResponseSchema)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    normalized_email = credentials.email.strip().lower()
    logger.info(f"LOGIN ATTEMPT: {normalized_email}")

    user = db.query(User).filter(User.email == normalized_email).first()

    # Use constant-time comparison to avoid user-enumeration timing attacks
    # Always run verify even on missing user (with a dummy hash)
    dummy_hash = "$2b$12$dummyhashvalueusedtopreventtimingattacks000000000000000"
    hash_to_check = user.hashed_password if (user and user.hashed_password) else dummy_hash
    password_match = AuthService.verify_password(credentials.password, hash_to_check)

    if not user or not user.hashed_password or not password_match:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    access_token_expiry = timedelta(days=30) if credentials.remember else timedelta(minutes=30)
    refresh_token_expiry = timedelta(days=30) if credentials.remember else timedelta(days=7)

    access_token = AuthService.create_access_token(
        data={"sub": user.email, "uid": user.id, "role": user.role.value},
        expires_delta=access_token_expiry
    )
    refresh_token = AuthService.create_refresh_token(
        data={"sub": user.email},
        expires_delta=refresh_token_expiry
    )
    logger.info(f"LOGIN SUCCESS: {user.id}")

    return AuthResponseSchema(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserSchema.model_validate(user),
    )


@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(verify_token)):
    return current_user


@router.post("/reset-password")
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)):
    normalized_email = data.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    if user:
        # Invalidate previous OTPs
        db.query(OTPRequest).filter(
            OTPRequest.email == normalized_email,
            OTPRequest.is_used == False,
        ).update({"is_used": True})

        # Generate cryptographically secure 6-digit OTP
        otp = str(secrets.randbelow(900000) + 100000)
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        otp_record = OTPRequest(email=normalized_email, otp=otp, expires_at=expires_at)
        db.add(otp_record)
        db.commit()

        try:
            EmailService.send_otp_email(normalized_email, otp)
        except Exception as e:
            logger.error(f"Email send failed: {e}")
            # Don't expose email failures to user

    # Always return same message to prevent user enumeration
    return {"message": "If the email is registered, an OTP will be sent."}


@router.post("/reset-password/verify")
def verify_password_reset(data: PasswordResetVerify, db: Session = Depends(get_db)):
    normalized_email = data.email.strip().lower()

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    otp_record = db.query(OTPRequest).filter(
        OTPRequest.email == normalized_email,
        OTPRequest.otp == data.otp,
        OTPRequest.is_used == False,
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    now = datetime.utcnow()
    if otp_record.expires_at.replace(tzinfo=None) < now:
        raise HTTPException(status_code=400, detail="OTP has expired")

    user = db.query(User).filter(User.email == normalized_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = AuthService.hash_password(data.new_password)
    otp_record.is_used = True
    db.commit()
    return {"message": "Password reset successful"}
