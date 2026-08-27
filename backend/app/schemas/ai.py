from datetime import date, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PlanRequest(BaseModel):
    destination_id: UUID | None = None
    destination_name: str | None = None
    start_date: date
    days: int = Field(3, ge=1, le=14)
    num_people: int = Field(2, ge=1)
    budget: Decimal | None = None
    interests: list[str] = []
    preferences: str | None = None


class ItineraryItemOut(BaseModel):
    id: UUID
    day_number: int
    start_time: time | None = None
    title: str
    description: str | None = None
    activity_type: str | None = None
    location_name: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    est_cost: Decimal | None = None
    weather_assumption: dict | None = None
    model_config = {"from_attributes": True}


class TripPlanOut(BaseModel):
    id: UUID
    title: str
    summary: str | None = None
    destination_id: UUID | None = None
    start_date: date | None = None
    end_date: date | None = None
    total_est_cost: Decimal | None = None
    status: str
    version: int
    inputs: dict | None = None
    items: list[ItineraryItemOut] = []
    model_config = {"from_attributes": True}


class AskRequest(BaseModel):
    question: str
    trip_plan_id: UUID | None = None
    context_type: str | None = None    # PACKAGE | DESTINATION | BOOKING | PROVIDER
    context_id: UUID | None = None


class AskResponse(BaseModel):
    answer: str


class DriftItem(BaseModel):
    day_number: int
    reason: str
    detail: str


class DriftResponse(BaseModel):
    has_drift: bool
    issues: list[DriftItem] = []