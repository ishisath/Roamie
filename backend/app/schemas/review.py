from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    booking_id: UUID
    subject_type: str                 # GUIDE | DRIVER | PACKAGE
    subject_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = None
    criteria: dict = {}               # e.g. {"safety": 5, "punctuality": 4}


class ReviewOut(BaseModel):
    id: UUID
    booking_id: UUID
    reviewer_id: UUID
    reviewer_name: str | None = None
    subject_type: str
    subject_id: UUID
    rating: int
    comment: str | None = None
    criteria: dict | None = None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ReviewableItem(BaseModel):
    booking_id: UUID
    reference: str | None = None
    subject_type: str
    subject_id: UUID
    subject_name: str
    start_date: str | None = None