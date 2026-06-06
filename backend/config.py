from pydantic_settings import BaseSettings
from typing import Optional

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
    SECRET_KEY: str = "yoursecretkeyhere"
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def assemble_db_url(self) -> str:
        """Construct async SQLAlchemy URL.
        Returns
        -------
        str
            Async PostgreSQL URL for SQLAlchemy (asyncpg driver).
        """
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

# Export a singleton settings instance used throughout the project
settings = Settings()
