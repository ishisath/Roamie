from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class ProviderCard(BaseModel):
    user_id: UUID
    full_name: str
    avatar_url: str | None = None
    country: str | None = None
    bio: str | None = None
    years_experience: int | None = None
    languages: list[str] | None = None
    specializations: list[str] | None = None
    rating_avg: Decimal | None = None
    rating_count: int | None = None
    is_verified: bool = False
    vehicle_summary: str | None = None
    daily_rate: Decimal | None = None


class VehicleBrief(BaseModel):
    id: UUID
    vehicle_type: str
    model: str | None = None
    seats: int
    is_ac: bool | None = None
    luggage_capacity: str | None = None
    facilities: list[str] | None = None
    photos: list[str] | None = None


class PackageBrief(BaseModel):
    id: UUID
    title: str
    duration_days: int
    price: Decimal
    currency: str
    transport_included: bool
    rating_avg: Decimal | None = None


class ProviderProfile(ProviderCard):
    qualifications: str | None = None
    certifications: str | None = None
    license_no: str | None = None
    packages: list[PackageBrief] = []
    vehicles: list[VehicleBrief] = []
    available_dates: list[date] = []
    