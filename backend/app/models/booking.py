from sqlalchemy import (Column, Date, DateTime, ForeignKey, Integer, Numeric,
                        String, Text, Time)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from app.core.enums import (BidStatus, BookingStatus, BookingType,
                            PaymentStatus, ProviderStatus, RequestStatus)
from app.db.base_class import Base, TimestampMixin, pk


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    id = pk()
    reference = Column(String(20), unique=True, index=True)
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    booking_type = Column(String(20), nullable=False)
    status = Column(String(20), default=BookingStatus.PENDING, nullable=False, index=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    start_time = Column(Time)
    num_travelers = Column(Integer, default=1)
    pickup_location = Column(String(255))
    dropoff_location = Column(String(255))
    total_amount = Column(Numeric(10, 2), default=0)
    currency = Column(String(5), default="LKR")
    payment_status = Column(String(20), default=PaymentStatus.PENDING, index=True)
    notes = Column(Text)
    cancelled_reason = Column(Text)

    items = relationship("BookingItem", back_populates="booking",
                         cascade="all, delete-orphan")


class BookingItem(Base, TimestampMixin):
    __tablename__ = "booking_items"

    id = pk()
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    service_type = Column(String(20), nullable=False)
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"))
    provider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"))
    amount = Column(Numeric(10, 2), default=0)
    platform_fee = Column(Numeric(10, 2), default=0)
    provider_net = Column(Numeric(10, 2), default=0)
    provider_status = Column(String(20), default=ProviderStatus.PENDING, index=True)
    trip_status = Column(String(20))

    booking = relationship("Booking", back_populates="items")


class TripStatusEvent(Base, TimestampMixin):
    __tablename__ = "trip_status_events"

    id = pk()
    booking_item_id = Column(UUID(as_uuid=True),
                             ForeignKey("booking_items.id", ondelete="CASCADE"),
                             nullable=False, index=True)
    status = Column(String(20), nullable=False)
    note = Column(String(255))


class TripRequest(Base, TimestampMixin):
    __tablename__ = "trip_requests"

    id = pk()
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(20), nullable=False)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), index=True)
    pickup_location = Column(String(255))
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    num_people = Column(Integer, default=1)
    vehicle_requirements = Column(String(255))
    tourist_requirements = Column(Text)
    budget_min = Column(Numeric(10, 2))
    budget_max = Column(Numeric(10, 2))
    notes = Column(Text)
    status = Column(String(20), default=RequestStatus.OPEN, index=True)

    bids = relationship("Bid", back_populates="request", cascade="all, delete-orphan")


class Bid(Base, TimestampMixin):
    __tablename__ = "bids"

    id = pk()
    request_id = Column(UUID(as_uuid=True), ForeignKey("trip_requests.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    provider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    provider_role = Column(String(20), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"))
    package_id = Column(UUID(as_uuid=True), ForeignKey("packages.id"))
    duration_days = Column(Integer)
    included_services = Column(ARRAY(String))
    notes = Column(Text)
    status = Column(String(20), default=BidStatus.PENDING, index=True)

    request = relationship("TripRequest", back_populates="bids")