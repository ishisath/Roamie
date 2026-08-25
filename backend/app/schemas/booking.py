from datetime import date, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class BookingItemIn(BaseModel):
    service_type: str          # PACKAGE | GUIDE | DRIVER
    package_id: UUID | None = None
    provider_id: UUID | None = None   # users.id of guide or driver
    vehicle_id: UUID | None = None
    amount: Decimal | None = None     # server recalculates for packages


class BookingCreate(BaseModel):
    booking_type: str          # PACKAGE | GUIDE | DRIVER | GUIDE_DRIVER
    destination_id: UUID | None = None
    start_date: date
    end_date: date | None = None
    start_time: time | None = None
    num_travelers: int = Field(1, ge=1)
    pickup_location: str | None = None
    dropoff_location: str | None = None
    notes: str | None = None
    items: list[BookingItemIn] = Field(min_length=1)

    @model_validator(mode="after")
    def check_items(self):
        types = [i.service_type for i in self.items]
        if self.booking_type == "GUIDE_DRIVER":
            if "GUIDE" not in types or "DRIVER" not in types:
                raise ValueError("GUIDE_DRIVER needs one GUIDE and one DRIVER item")
        elif self.booking_type in ("PACKAGE", "GUIDE", "DRIVER"):
            if len(self.items) != 1 or types[0] != self.booking_type:
                raise ValueError(f"{self.booking_type} booking needs exactly one "
                                 f"{self.booking_type} item")
        return self


class ProviderBrief(BaseModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    phone: str | None = None
    model_config = {"from_attributes": True}


class BookingItemOut(BaseModel):
    id: UUID
    service_type: str
    package_id: UUID | None = None
    provider_id: UUID | None = None
    vehicle_id: UUID | None = None
    amount: Decimal
    platform_fee: Decimal
    provider_net: Decimal
    provider_status: str
    trip_status: str | None = None
    model_config = {"from_attributes": True}


class BookingOut(BaseModel):
    id: UUID
    reference: str | None = None
    traveler_id: UUID
    booking_type: str
    status: str
    destination_id: UUID | None = None
    start_date: date
    end_date: date | None = None
    start_time: time | None = None
    num_travelers: int
    pickup_location: str | None = None
    dropoff_location: str | None = None
    total_amount: Decimal
    currency: str
    payment_status: str
    notes: str | None = None
    items: list[BookingItemOut] = []
    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: str
    note: str | None = None


class CancelIn(BaseModel):
    reason: str | None = None