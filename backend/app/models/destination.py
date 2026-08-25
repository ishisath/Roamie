from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer,
                        Numeric, String, Text)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.enums import ContentStatus, SuggestionKind, VerificationStatus
from app.db.base_class import Base, TimestampMixin, pk


class DestinationCategory(Base, TimestampMixin):
    __tablename__ = "destination_categories"

    id = pk()
    name = Column(String(80), nullable=False)
    slug = Column(String(80), unique=True, nullable=False)
    icon = Column(String(60))

    destinations = relationship("Destination", back_populates="category")


class Destination(Base, TimestampMixin):
    __tablename__ = "destinations"

    id = pk()
    name = Column(String(150), nullable=False)
    slug = Column(String(160), unique=True, nullable=False, index=True)
    description = Column(Text)
    country = Column(String(80), default="Sri Lanka")
    region = Column(String(120), index=True)
    lat = Column(Numeric(9, 6))
    lng = Column(Numeric(9, 6))
    category_id = Column(UUID(as_uuid=True), ForeignKey("destination_categories.id"), index=True)
    best_time_to_visit = Column(String(150))
    est_cost_min = Column(Numeric(10, 2))
    est_cost_max = Column(Numeric(10, 2))
    popular_attractions = Column(JSONB, default=list)
    activities = Column(ARRAY(String))
    recommended_clothing = Column(ARRAY(String))
    necessary_items = Column(ARRAY(String))
    travel_warnings = Column(Text)
    other_info = Column(Text)
    is_featured = Column(Boolean, default=False, index=True)
    is_trending = Column(Boolean, default=False, index=True)
    search_count = Column(Integer, default=0)
    booking_count = Column(Integer, default=0)
    rating_avg = Column(Numeric(3, 2), default=0)
    status = Column(String(20), default=ContentStatus.ACTIVE, index=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

    category = relationship("DestinationCategory", back_populates="destinations")
    photos = relationship("DestinationPhoto", back_populates="destination",
                          cascade="all, delete-orphan")


class DestinationPhoto(Base, TimestampMixin):
    __tablename__ = "destination_photos"

    id = pk()
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id", ondelete="CASCADE"),
                            nullable=False, index=True)
    url = Column(Text, nullable=False)
    caption = Column(String(200))
    sort_order = Column(Integer, default=0)

    destination = relationship("Destination", back_populates="photos")


class DestinationSuggestion(Base, TimestampMixin):
    __tablename__ = "destination_suggestions"

    id = pk()
    submitted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(15), default=SuggestionKind.NEW, nullable=False)
    target_destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"))
    name = Column(String(150))
    region = Column(String(120))
    lat = Column(Numeric(9, 6))
    lng = Column(Numeric(9, 6))
    description = Column(Text)
    why_popular = Column(Text)
    category_id = Column(UUID(as_uuid=True), ForeignKey("destination_categories.id"))
    activities = Column(ARRAY(String))
    photos = Column(ARRAY(String))
    payload = Column(JSONB, default=dict)
    status = Column(String(25), default=VerificationStatus.PENDING, index=True)
    admin_note = Column(Text)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at = Column(DateTime(timezone=True))