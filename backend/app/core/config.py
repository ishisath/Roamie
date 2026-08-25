import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PROJECT_NAME = "Roamie API"
    API_V1 = "/api/v1"

    DATABASE_URL = os.getenv("DATABASE_URL")
    DATABASE_URL_DIRECT = os.getenv("DATABASE_URL_DIRECT")

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS = 7

    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
    CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_UPLOAD_PRESET = os.getenv("CLOUDINARY_UPLOAD_PRESET", "")
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "MOCK")

    PLATFORM_COMMISSION = 0.10


settings = Settings()