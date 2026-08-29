from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class GuideProfileUpdate(BaseModel):
    bio: str | None = None
    years_experience: int | None = Field(None, ge=0, le=60)
    languages: list[str] | None = None
    specializations: list[str] | None = None
    qualifications: str | None = None
    certifications: str | None = None
    sltda_registered: bool | None = None
    sltda_number: str | None = None
    daily_rate: Decimal | None = Field(None, ge=0)
    verification_docs: list[str] | None = None


class DriverProfileUpdate(BaseModel):
    bio: str | None = None
    years_experience: int | None = Field(None, ge=0, le=60)
    languages: list[str] | None = None
    license_no: str | None = None
    license_expiry: date | None = None
    daily_rate: Decimal | None = Field(None, ge=0)
    verification_docs: list[str] | None = None


class ProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    phone: str | None = None
    country: str | None = None
    avatar_url: str | None = None

    bio: str | None = None
    years_experience: int | None = None
    languages: list[str] | None = None
    specializations: list[str] | None = None
    qualifications: str | None = None
    certifications: str | None = None
    sltda_registered: bool | None = None
    sltda_number: str | None = None
    license_no: str | None = None
    license_expiry: date | None = None
    daily_rate: Decimal | None = None
    verification_docs: list[str] | None = None
    verification_status: str
    admin_note: str | None = None
    rating_avg: Decimal | None = None
    rating_count: int | None = None

    completeness: int = 0
    missing: list[str] = []


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    country: str | None = None
    avatar_url: str | None = None