from sqlalchemy import (Boolean, Column, Date, ForeignKey, Integer, Numeric,
                        String, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.core.enums import AvailabilityStatus, ContentStatus
from app.db.base_class import Base, TimestampMixin, pk


class Package(Base, TimestampMixin):
    __tablename__ = "packages"

    id = pk()
    guide_id = Column(UUID(as_uuid=True), ForeignKey("guide_profiles.id", ondelete="CASCADE"),
                      nullable=False, index=True)
    title = Column(String(180), nullable=False)
    description = Column(Text)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"),
                            nullable=False, index=True)
    package_type = Column(String(60))
    duration_days = Column(Integer, nullable=False, default=1)
    price = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(5), default="LKR")
    max_travelers = Column(Integer, default=10)
    activities = Column(ARRAY(String))
    included = Column(ARRAY(String))
    excluded = Column(ARRAY(String))

    transport_included = Column(Boolean, default=False, nullable=False)
    vehicle_type = Column(String(60))
    vehicle_seats = Column(Integer)
    is_ac = Column(Boolean)
    pickup_info = Column(Text)
    dropoff_info = Column(Text)
    driver_info = Column(Text)
    extra_transport_cost = Column(Numeric(10, 2), default=0)

    status = Column(String(20), default=ContentStatus.ACTIVE, index=True)
    rating_avg = Column(Numeric(3, 2), default=0)
    rating_count = Column(Integer, default=0)
    booking_count = Column(Integer, default=0)

    photos = relationship("PackagePhoto", back_populates="package",
                          cascade="all, delete-orphan")
    dates = relationship("PackageDate", back_populates="package",
                         cascade="all, delete-orphan")


class PackagePhoto(Base, TimestampMixin):
    __tablename__ = "package_photos"

    id = pk()
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    url = Column(Text, nullable=False)
    sort_order = Column(Integer, default=0)

    package = relationship("Package", back_populates="photos")


class PackageDate(Base, TimestampMixin):
    __tablename__ = "package_dates"

    id = pk()
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    slots_total = Column(Integer, default=10)
    slots_booked = Column(Integer, default=0)

    package = relationship("Package", back_populates="dates")


class Availability(Base, TimestampMixin):
    __tablename__ = "availability"
    __table_args__ = (UniqueConstraint("provider_id", "date", name="uq_provider_date"),)

    id = pk()
    provider_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    status = Column(String(20), default=AvailabilityStatus.AVAILABLE, nullable=False)
    note = Column(String(200))