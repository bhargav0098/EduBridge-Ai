from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uuid
from typing import List
from functools import wraps

from ..database import get_db
from ..models.models import User, UserRole, StudentProfile
from ..schemas.schemas import UserRegister, UserLogin, TokenSchema, UserSchema, PasswordResetRequest, PasswordResetVerify
from ..services.auth_service import AuthService

router = APIRouter()
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user

# Helper function decorator for route-level custom decoration
def token_required(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # This wrapper serves as a placeholder / utility decorator if required
        return await func(*args, **kwargs)
    return wrapper

class RoleChecker:
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: User = Depends(verify_token)):
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role",
            )
        return current_user

@router.post("/register", response_model=TokenSchema, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Hash password
    hashed_pw = AuthService.hash_password(user_data.password)

    # Create user
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_pw,
        role=user_data.role or UserRole.STUDENT,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create StudentProfile if user is STUDENT
    if new_user.role == UserRole.STUDENT:
        profile = StudentProfile(
            user_id=new_user.id,
            weak_subjects=[],
            study_time_preference="Morning",
            class_name="Class 11",
            elo=1200
        )
        db.add(profile)
        db.commit()

    # Generate token
    access_token = AuthService.create_access_token(data={"sub": new_user.email, "role": new_user.role.value})
    refresh_token = AuthService.create_refresh_token(data={"sub": new_user.email})

    return TokenSchema(access_token=access_token, refresh_token=refresh_token)

@router.post("/login", response_model=TokenSchema)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not AuthService.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Generate tokens
    access_token = AuthService.create_access_token(data={"sub": user.email, "role": user.role.value})
    refresh_token = AuthService.create_refresh_token(data={"sub": user.email})

    return TokenSchema(access_token=access_token, refresh_token=refresh_token)

@router.get("/me", response_model=UserSchema)
def get_me(current_user: User = Depends(verify_token)):
    return current_user

@router.post("/reset-password")
def request_password_reset(data: PasswordResetRequest):
    # Stub OTP logic for later implementation
    return {"message": "OTP sent successfully to email (stub)"}

@router.post("/reset-password/verify")
def verify_password_reset(data: PasswordResetVerify, db: Session = Depends(get_db)):
    # Stub verification
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = AuthService.hash_password(data.new_password)
    db.commit()
    return {"message": "Password reset successful (stub)"}
