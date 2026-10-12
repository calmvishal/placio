from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Assisted Placement & Training Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Server
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    # Database
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "tpo_portal_db"
    
    # Security & JWT
    JWT_SECRET_KEY: str = "development_secret_key_super_secure_32_characters_minimum"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    
    # AI Service
    AI_PROVIDER: str = "mock" # "mock" or "gemini"
    GEMINI_API_KEY: str = ""
    AI_TIMEOUT_SECONDS: int = 30
    AI_MOCK_FALLBACK: bool = True
    
    # Uploads
    MAX_UPLOAD_SIZE_MB: int = 5
    UPLOAD_DIR: str = "uploads"

    # SMTP Email Service
    SMTP_ENABLED: bool = False
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "tpo-portal@college.edu"
    SMTP_FROM_NAME: str = "TPO Placement Office"
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
