from datetime import date, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class BookingItemIn(BaseModel):
    service_type: str
    package_id: UUID | None = None
    provider_id: UUID | None = None
    vehicle_id: UUID | None = None
    amount: Decimal | None = None


class BookingCreate(BaseModel):
    booking_type: str
    destination_id: UUID | None = None
    trip_plan_id: UUID | None = None
    budget_total: Decimal | None = None
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
                raise ValueError("A guide + driver booking needs one of each")
        elif self.booking_type in ("PACKAGE", "GUIDE", "DRIVER"):
            if len(self.items) != 1 or types[0] != self.booking_type:
                raise ValueError(
                    f"A {self.booking_type.lower()} booking needs exactly one "
                    f"{self.booking_type.lower()} item"
                )
        return self


class VehicleInfo(BaseModel):
    id: UUID
    vehicle_type: str
    model: str | None = None
    reg_no: str
    seats: int
    is_ac: bool | None = None
    luggage_capacity: str | None = None
    facilities: list[str] | None = None
    photos: list[str] | None = None


class ProviderInfo(BaseModel):
    id: UUID
    full_name: str
    role: str
    phone: str | None = None
    email: str | None = None
    avatar_url: str | None = None
    languages: list[str] | None = None
    years_experience: int | None = None
    rating_avg: Decimal | None = None
    rating_count: int | None = None


class PackageInfo(BaseModel):
    id: UUID
    title: str
    duration_days: int
    price: Decimal
    included: list[str] | None = None
    excluded: list[str] | None = None
    activities: list[str] | None = None
    transport_included: bool
    vehicle_type: str | None = None
    vehicle_seats: int | None = None
    is_ac: bool | None = None
    pickup_info: str | None = None
    dropoff_info: str | None = None
    photo: str | None = None


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
    provider: ProviderInfo | None = None
    package: PackageInfo | None = None
    vehicle: VehicleInfo | None = None
    model_config = {"from_attributes": True}


class DestinationInfo(BaseModel):
    id: UUID
    name: str
    slug: str
    region: str | None = None
    photo: str | None = None


class TravelerInfo(BaseModel):
    id: UUID
    full_name: str
    phone: str | None = None
    email: str | None = None
    country: str | None = None


class BookingOut(BaseModel):
    id: UUID
    reference: str | None = None
    traveler_id: UUID
    booking_type: str
    status: str
    destination_id: UUID | None = None
    trip_plan_id: UUID | None = None
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
    cancelled_reason: str | None = None
    items: list[BookingItemOut] = []
    destination: DestinationInfo | None = None
    traveler: TravelerInfo | None = None
    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: str
    note: str | None = None


class CancelIn(BaseModel):
    reason: str | None = None

class ProviderResponse(BaseModel):
    accept: bool
    note: str | None = None