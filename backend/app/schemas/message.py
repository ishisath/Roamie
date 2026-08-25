from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageOut(BaseModel):
    id: UUID
    booking_id: UUID
    sender_id: UUID
    receiver_id: UUID
    body: str
    sent_at: datetime | None = None
    read_at: datetime | None = None
    model_config = {"from_attributes": True}


class ThreadOut(BaseModel):
    booking_id: UUID
    reference: str | None = None
    other_party_id: UUID
    other_party_name: str
    other_party_role: str
    last_message: str | None = None
    last_sent_at: datetime | None = None
    unread: int