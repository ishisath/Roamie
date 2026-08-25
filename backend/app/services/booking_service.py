import random
import string
from datetime import date
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import (AvailabilityStatus, BookingStatus, ProviderStatus,
                            Role, ServiceType, TripStatus)
from app.models.booking import Booking, BookingItem, TripStatusEvent
from app.models.package import Availability, Package
from app.models.user import DriverProfile, GuideProfile, User, Vehicle


def make_reference() -> str:
    return "RM" + "".join(random.choices(string.ascii_uppercase + string.digits, k=8))


def _split_fee(amount: Decimal) -> tuple[Decimal, Decimal]:
    fee = (amount * Decimal(str(settings.PLATFORM_COMMISSION))).quantize(Decimal("0.01"))
    return fee, amount - fee


def _check_provider(db: Session, provider_id, expected_role: str) -> User:
    user = db.query(User).filter(User.id == provider_id).first()
    if not user:
        raise HTTPException(404, "Provider not found")
    if user.role != expected_role:
        raise HTTPException(400, f"User is not a {expected_role.lower()}")
    if not user.is_active:
        raise HTTPException(400, "Provider account is inactive")

    profile = user.guide_profile if expected_role == Role.GUIDE else user.driver_profile
    if not profile or profile.verification_status != "APPROVED":
        raise HTTPException(400, "Provider is not verified")
    return user


def _check_availability(db: Session, provider_id, start: date, end: date | None):
    end = end or start
    blocked = (db.query(Availability)
               .filter(Availability.provider_id == provider_id,
                       Availability.date >= start,
                       Availability.date <= end,
                       Availability.status != AvailabilityStatus.AVAILABLE)
               .first())
    if blocked:
        raise HTTPException(409, f"Provider is unavailable on {blocked.date}")


def _hold_dates(db: Session, provider_id, start: date, end: date | None):
    end = end or start
    (db.query(Availability)
     .filter(Availability.provider_id == provider_id,
             Availability.date >= start, Availability.date <= end)
     .update({"status": AvailabilityStatus.BOOKED}, synchronize_session=False))


def _release_dates(db: Session, provider_id, start: date, end: date | None):
    end = end or start
    (db.query(Availability)
     .filter(Availability.provider_id == provider_id,
             Availability.date >= start, Availability.date <= end,
             Availability.status == AvailabilityStatus.BOOKED)
     .update({"status": AvailabilityStatus.AVAILABLE}, synchronize_session=False))


def create_booking(db: Session, traveler: User, data) -> Booking:
    booking = Booking(
        reference=make_reference(),
        traveler_id=traveler.id,
        booking_type=data.booking_type,
        status=BookingStatus.PENDING,
        destination_id=data.destination_id,
        start_date=data.start_date,
        end_date=data.end_date,
        start_time=data.start_time,
        num_travelers=data.num_travelers,
        pickup_location=data.pickup_location,
        dropoff_location=data.dropoff_location,
        notes=data.notes,
    )
    db.add(booking)
    db.flush()

    total = Decimal("0")

    for item in data.items:
        st = item.service_type

        if st == ServiceType.PACKAGE:
            pkg = db.query(Package).filter(Package.id == item.package_id).first()
            if not pkg:
                raise HTTPException(404, "Package not found")
            if data.num_travelers > pkg.max_travelers:
                raise HTTPException(400,
                    f"Package allows a maximum of {pkg.max_travelers} travelers")

            amount = Decimal(str(pkg.price)) * data.num_travelers
            if pkg.extra_transport_cost:
                amount += Decimal(str(pkg.extra_transport_cost))

            guide_profile = db.query(GuideProfile).filter_by(id=pkg.guide_id).first()
            provider_user_id = guide_profile.user_id if guide_profile else None

            if provider_user_id:
                _check_availability(db, provider_user_id, data.start_date, data.end_date)

            fee, net = _split_fee(amount)
            db.add(BookingItem(
                booking_id=booking.id, service_type=st, package_id=pkg.id,
                provider_id=provider_user_id, amount=amount,
                platform_fee=fee, provider_net=net,
                provider_status=ProviderStatus.PENDING,
            ))
            if not booking.destination_id:
                booking.destination_id = pkg.destination_id
            total += amount

        elif st in (ServiceType.GUIDE, ServiceType.DRIVER):
            role = Role.GUIDE if st == ServiceType.GUIDE else Role.DRIVER
            _check_provider(db, item.provider_id, role)
            _check_availability(db, item.provider_id, data.start_date, data.end_date)

            profile = (db.query(GuideProfile).filter_by(user_id=item.provider_id).first()
                       if st == ServiceType.GUIDE
                       else db.query(DriverProfile).filter_by(user_id=item.provider_id).first())

            rate = Decimal(str(profile.daily_rate or 0)) if profile else Decimal("0")
            days = ((data.end_date - data.start_date).days + 1) if data.end_date else 1

            if rate > 0:
                amount = rate * days          # server decides the price
            elif item.amount is not None:
                amount = Decimal(str(item.amount))
            else:
                raise HTTPException(400, f"No rate set for this {st.lower()}")

            vehicle_id = None
            if st == ServiceType.DRIVER and item.vehicle_id:
                v = db.query(Vehicle).filter(Vehicle.id == item.vehicle_id).first()
                if not v:
                    raise HTTPException(404, "Vehicle not found")
                if v.seats < data.num_travelers:
                    raise HTTPException(400,
                        f"Vehicle seats {v.seats} is fewer than {data.num_travelers} travelers")
                vehicle_id = v.id

            fee, net = _split_fee(amount)
            db.add(BookingItem(
                booking_id=booking.id, service_type=st,
                provider_id=item.provider_id, vehicle_id=vehicle_id,
                amount=amount, platform_fee=fee, provider_net=net,
                provider_status=ProviderStatus.PENDING,
            ))
            total += amount
        else:
            raise HTTPException(400, f"Unknown service type {st}")

        booking.total_amount = total

    from app.services import notification_service
    items = db.query(BookingItem).filter(BookingItem.booking_id == booking.id).all()
    notification_service.notify_many(
        db, [i.provider_id for i in items],
        "BOOKING_REQUEST", "New booking request",
        f"A traveler requested {booking.booking_type} for {booking.start_date}.",
    )

    db.commit()
    db.refresh(booking)
    return booking


def confirm_booking(db: Session, booking: Booking) -> Booking:
    """Called after payment succeeds."""
    booking.status = BookingStatus.CONFIRMED
    for item in booking.items:
        item.provider_status = ProviderStatus.ACCEPTED
        if item.service_type == ServiceType.DRIVER:
            item.trip_status = TripStatus.CONFIRMED
        if item.provider_id:
            _hold_dates(db, item.provider_id, booking.start_date, booking.end_date)
    db.commit()
    db.refresh(booking)
    return booking


def cancel_booking(db: Session, booking: Booking, reason: str | None) -> Booking:
    if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED):
        raise HTTPException(400, f"Cannot cancel a {booking.status.lower()} booking")
    booking.status = BookingStatus.CANCELLED
    booking.cancelled_reason = reason
    for item in booking.items:
        if item.provider_id:
            _release_dates(db, item.provider_id, booking.start_date, booking.end_date)
    db.commit()
    db.refresh(booking)
    return booking


def update_trip_status(db: Session, item: BookingItem, status: str,
                       note: str | None) -> BookingItem:
    order = [TripStatus.CONFIRMED, TripStatus.ON_THE_WAY, TripStatus.PICKED_UP,
             TripStatus.STARTED, TripStatus.COMPLETED]
    if status not in order:
        raise HTTPException(400, "Invalid trip status")

    current = item.trip_status or TripStatus.CONFIRMED
    if order.index(status) <= order.index(current):
        raise HTTPException(400, f"Cannot move from {current} back to {status}")

    item.trip_status = status
    db.add(TripStatusEvent(booking_item_id=item.id, status=status, note=note))

    if status == TripStatus.COMPLETED:
        booking = item.booking
        if all(i.trip_status == TripStatus.COMPLETED
               for i in booking.items if i.service_type == ServiceType.DRIVER):
            booking.status = BookingStatus.COMPLETED

    db.commit()
    db.refresh(item)
    return item