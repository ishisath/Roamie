from sqlalchemy import (Column, Date, DateTime, ForeignKey, Integer, Numeric,
                        String, Text, Time, UniqueConstraint)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base, TimestampMixin, pk


class TripPlan(Base, TimestampMixin):
    __tablename__ = "trip_plans"

    id = pk()
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"))
    title = Column(String(180), nullable=False)
    inputs = Column(JSONB, default=dict)
    summary = Column(Text)
    total_est_cost = Column(Numeric(10, 2))
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String(20), default="DRAFT", index=True)
    version = Column(Integer, default=1)

    items = relationship("ItineraryItem", back_populates="plan",
                         cascade="all, delete-orphan")


class ItineraryItem(Base, TimestampMixin):
    __tablename__ = "itinerary_items"

    id = pk()
    trip_plan_id = Column(UUID(as_uuid=True), ForeignKey("trip_plans.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    start_time = Column(Time)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    activity_type = Column(String(60))
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"))
    location_name = Column(String(180))
    lat = Column(Numeric(9, 6))
    lng = Column(Numeric(9, 6))
    est_cost = Column(Numeric(10, 2), default=0)
    weather_assumption = Column(JSONB, default=dict)
    sort_order = Column(Integer, default=0)

    plan = relationship("TripPlan", back_populates="items")


class PlanRevision(Base, TimestampMixin):
    __tablename__ = "plan_revisions"

    id = pk()
    trip_plan_id = Column(UUID(as_uuid=True), ForeignKey("trip_plans.id", ondelete="CASCADE"),
                          nullable=False, index=True)
    reason = Column(String(255))
    trigger = Column(String(60))
    diff = Column(JSONB, default=dict)
    applied_at = Column(DateTime(timezone=True))


class AIMessage(Base, TimestampMixin):
    __tablename__ = "ai_messages"

    id = pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    context_type = Column(String(40))
    context_id = Column(UUID(as_uuid=True))
    role = Column(String(15), nullable=False)
    content = Column(Text, nullable=False)


class WeatherCache(Base, TimestampMixin):
    __tablename__ = "weather_cache"
    __table_args__ = (UniqueConstraint("lat_r", "lng_r", "date", name="uq_weather_point_date"),)

    id = pk()
    lat_r = Column(Numeric(6, 2), nullable=False)
    lng_r = Column(Numeric(6, 2), nullable=False)
    date = Column(Date, nullable=False)
    payload = Column(JSONB, nullable=False)
    fetched_at = Column(DateTime(timezone=True))