from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class GuideBrief(BaseModel):
    id: UUID
    full_name: str
    avatar_url: str | None = None
    model_config = {"from_attributes": True}


class PackagePhotoOut(BaseModel):
    id: UUID
    url: str
    model_config = {"from_attributes": True}


class PackageDateOut(BaseModel):
    id: UUID
    start_date: date
    end_date: date
    slots_total: int
    slots_booked: int
    model_config = {"from_attributes": True}


class PackageCard(BaseModel):
    id: UUID
    title: str
    package_type: str | None = None
    duration_days: int
    price: Decimal
    currency: str
    max_travelers: int
    rating_avg: Decimal | None = None
    rating_count: int | None = None
    transport_included: bool
    photos: list[PackagePhotoOut] = []
    model_config = {"from_attributes": True}


class PackageDetail(PackageCard):
    description: str | None = None
    activities: list[str] | None = None
    included: list[str] | None = None
    excluded: list[str] | None = None
    vehicle_type: str | None = None
    vehicle_seats: int | None = None
    is_ac: bool | None = None
    pickup_info: str | None = None
    dropoff_info: str | None = None
    driver_info: str | None = None
    extra_transport_cost: Decimal | None = None
    dates: list[PackageDateOut] = []


class PackageCreate(BaseModel):
    title: str
    description: str | None = None
    destination_id: UUID
    package_type: str | None = None
    duration_days: int = 1
    price: Decimal
    max_travelers: int = 10
    activities: list[str] = []
    included: list[str] = []
    excluded: list[str] = []
    transport_included: bool = False
    vehicle_type: str | None = None
    vehicle_seats: int | None = None
    is_ac: bool | None = None
    pickup_info: str | None = None
    dropoff_info: str | None = None
    driver_info: str | None = None
    extra_transport_cost: Decimal = Decimal("0")