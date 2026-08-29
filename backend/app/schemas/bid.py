from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class TripRequestCreate(BaseModel):
    kind: str = "DRIVER"                # GUIDE | DRIVER | BOTH
    destination_id: UUID | None = None
    pickup_location: str | None = None
    start_date: date
    end_date: date | None = None
    num_people: int = Field(1, ge=1)
    vehicle_requirements: str | None = None
    tourist_requirements: str | None = None
    budget_min: Decimal | None = None
    budget_max: Decimal | None = None
    notes: str | None = None
    destination_text: str | None = None
    pickup_lat: Decimal | None = None
    pickup_lng: Decimal | None = None


class BidCreate(BaseModel):
    price: Decimal = Field(gt=0)
    vehicle_id: UUID | None = None
    package_id: UUID | None = None
    duration_days: int | None = None
    included_services: list[str] = []
    notes: str | None = None


class BidOut(BaseModel):
    id: UUID
    request_id: UUID
    provider_id: UUID
    provider_name: str | None = None
    provider_role: str
    provider_rating: Decimal | None = None
    provider_experience: int | None = None
    price: Decimal
    vehicle_id: UUID | None = None
    vehicle_summary: str | None = None
    duration_days: int | None = None
    included_services: list[str] | None = None
    notes: str | None = None
    status: str
    model_config = {"from_attributes": True}


class TripRequestOut(BaseModel):
    id: UUID
    traveler_id: UUID
    traveler_name: str | None = None
    kind: str
    destination_id: UUID | None = None
    destination_name: str | None = None
    pickup_location: str | None = None
    start_date: date
    end_date: date | None = None
    num_people: int
    vehicle_requirements: str | None = None
    tourist_requirements: str | None = None
    budget_min: Decimal | None = None
    budget_max: Decimal | None = None
    notes: str | None = None
    status: str
    bid_count: int = 0
    bids: list[BidOut] = []
    destination_text: str | None = None
    pickup_lat: Decimal | None = None
    pickup_lng: Decimal | None = None