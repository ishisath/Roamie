from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class AdminUserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    phone: str | None = None
    country: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    verification_status: str | None = None
    model_config = {"from_attributes": True}


class VerificationAction(BaseModel):
    action: str            # APPROVE | REJECT | REQUEST_CHANGES
    note: str | None = None


class UserAction(BaseModel):
    is_active: bool
    note: str | None = None


class SuggestionOut(BaseModel):
    id: UUID
    kind: str
    submitted_by: UUID
    submitter_name: str | None = None
    target_destination_id: UUID | None = None
    name: str | None = None
    region: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    description: str | None = None
    why_popular: str | None = None
    activities: list[str] | None = None
    photos: list[str] | None = None
    status: str
    admin_note: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class SuggestionCreate(BaseModel):
    kind: str = "NEW"
    target_destination_id: UUID | None = None
    name: str | None = None
    region: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    description: str | None = None
    why_popular: str | None = None
    category_id: UUID | None = None
    activities: list[str] = []
    photos: list[str] = []


class ReportCreate(BaseModel):
    target_type: str
    target_id: UUID
    reason: str
    description: str | None = None


class ReportOut(BaseModel):
    id: UUID
    reporter_id: UUID
    target_type: str
    target_id: UUID
    reason: str
    description: str | None = None
    status: str
    admin_note: str | None = None
    created_at: datetime
    model_config = {"from_attributes": True}


class ReportAction(BaseModel):
    status: str
    admin_note: str | None = None


class AnalyticsOut(BaseModel):
    travelers: int
    guides: int
    drivers: int
    pending_guides: int
    pending_drivers: int
    pending_vehicles: int
    destinations: int
    packages: int
    bookings: int
    completed_bookings: int
    cancelled_bookings: int
    revenue: Decimal
    commission: Decimal
    pending_suggestions: int
    open_reports: int
    popular_destinations: list[dict]
    popular_packages: list[dict]
    monthly_bookings: list[dict]

