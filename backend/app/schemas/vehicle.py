from uuid import UUID

from pydantic import BaseModel, Field


class VehicleCreate(BaseModel):
    vehicle_type: str
    model: str | None = None
    reg_no: str = Field(min_length=3, max_length=40)
    seats: int = Field(4, ge=1, le=60)
    is_ac: bool = True
    luggage_capacity: str | None = None
    facilities: list[str] = []
    photos: list[str] = []


class VehicleOut(BaseModel):
    id: UUID
    vehicle_type: str
    model: str | None = None
    reg_no: str
    seats: int
    is_ac: bool | None = None
    luggage_capacity: str | None = None
    facilities: list[str] | None = None
    photos: list[str] | None = None
    verification_status: str
    is_active: bool
    model_config = {"from_attributes": True}