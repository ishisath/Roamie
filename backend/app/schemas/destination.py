from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: UUID
    name: str
    slug: str
    icon: str | None = None
    model_config = {"from_attributes": True}


class PhotoOut(BaseModel):
    id: UUID
    url: str
    caption: str | None = None
    model_config = {"from_attributes": True}


class DestinationCard(BaseModel):
    """Slim shape for grids and lists."""
    id: UUID
    name: str
    slug: str
    region: str | None = None
    description: str | None = None
    est_cost_min: Decimal | None = None
    est_cost_max: Decimal | None = None
    rating_avg: Decimal | None = None
    is_featured: bool
    is_trending: bool
    activities: list[str] | None = None
    category: CategoryOut | None = None
    photos: list[PhotoOut] = []
    model_config = {"from_attributes": True}


class DestinationDetail(DestinationCard):
    country: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    best_time_to_visit: str | None = None
    popular_attractions: list | None = None
    recommended_clothing: list[str] | None = None
    necessary_items: list[str] | None = None
    travel_warnings: str | None = None
    other_info: str | None = None
    search_count: int | None = None


class Paginated(BaseModel):
    total: int
    page: int
    size: int
    items: list

class DestinationCreate(BaseModel):
    name: str
    slug: str | None = None          # generated from name if omitted
    description: str | None = None
    country: str = "Sri Lanka"
    region: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    category_id: UUID | None = None
    best_time_to_visit: str | None = None
    est_cost_min: Decimal | None = None
    est_cost_max: Decimal | None = None
    popular_attractions: list[dict] = []
    activities: list[str] = []
    recommended_clothing: list[str] = []
    necessary_items: list[str] = []
    travel_warnings: str | None = None
    other_info: str | None = None
    is_featured: bool = False
    is_trending: bool = False
    photos: list[str] = []


class DestinationUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    region: str | None = None
    lat: Decimal | None = None
    lng: Decimal | None = None
    category_id: UUID | None = None
    best_time_to_visit: str | None = None
    est_cost_min: Decimal | None = None
    est_cost_max: Decimal | None = None
    popular_attractions: list[dict] | None = None
    activities: list[str] | None = None
    recommended_clothing: list[str] | None = None
    necessary_items: list[str] | None = None
    travel_warnings: str | None = None
    other_info: str | None = None
    is_featured: bool | None = None
    is_trending: bool | None = None
    status: str | None = None