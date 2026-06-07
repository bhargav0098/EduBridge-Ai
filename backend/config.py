from pydantic_settings import BaseSettings
from typing import Optional
import secrets


class Settings(BaseSettings):
    # Project metadata
    PROJECT_NAME: str = "EduBridge API"
    VERSION: str = "0.1.0"

    # PostgreSQL configuration
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "edubridge"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Redis configuration
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Sentry DSN (optional)
    SENTRY_DSN: Optional[str] = None

    # Custom environment variables
    DATABASE_URL: Optional[str] = None
    # Generate a fallback secret for dev, but warn loudly in prod
    SECRET_KEY: str = secrets.token_hex(32)
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    DEBUG: bool = True

    # SMTP for email (OTP reset)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    def assemble_db_url(self) -> str:
        """Construct sync SQLAlchemy URL."""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )


# Export a singleton settings instance used throughout the project
settings = Settings()

# Warn if using default secret key in production
if not settings.DEBUG and settings.SECRET_KEY == "yoursecretkeyhere":
    import warnings
    warnings.warn(
        "SECURITY WARNING: SECRET_KEY is not set. "
        "Set a strong SECRET_KEY in your environment variables.",
        stacklevel=2,
    )
