from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_role
from app.core.enums import Role, ServiceType
from app.db.session import get_db
from app.models.booking import Booking, BookingItem
from app.models.destination import Destination
from app.models.package import Package
from app.models.user import DriverProfile, GuideProfile, User, Vehicle
from app.schemas.booking import (BookingCreate, BookingItemOut, BookingOut,
                                 CancelIn, DestinationInfo, PackageInfo,
                                 ProviderInfo, ProviderResponse, StatusUpdate,
                                 TravelerInfo, VehicleInfo)
from app.services import booking_service as svc

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _enrich(db: Session, booking: Booking) -> BookingOut:
    """Attach names, contact details and service info to a booking."""
    items = []

    for it in booking.items:
        provider = package = vehicle = None

        if it.provider_id:
            u = db.query(User).filter(User.id == it.provider_id).first()
            if u:
                profile = (u.guide_profile if u.role == Role.GUIDE else u.driver_profile)
                provider = ProviderInfo(
                    id=u.id, full_name=u.full_name, role=u.role,
                    phone=u.phone, email=u.email, avatar_url=u.avatar_url,
                    languages=profile.languages if profile else None,
                    years_experience=profile.years_experience if profile else None,
                    rating_avg=profile.rating_avg if profile else None,
                    rating_count=profile.rating_count if profile else None,
                )

        if it.package_id:
            p = (db.query(Package).options(joinedload(Package.photos))
                 .filter(Package.id == it.package_id).first())
            if p:
                package = PackageInfo(
                    id=p.id, title=p.title, duration_days=p.duration_days,
                    price=p.price, included=p.included, excluded=p.excluded,
                    activities=p.activities,
                    transport_included=p.transport_included,
                    vehicle_type=p.vehicle_type, vehicle_seats=p.vehicle_seats,
                    is_ac=p.is_ac, pickup_info=p.pickup_info,
                    dropoff_info=p.dropoff_info,
                    photo=p.photos[0].url if p.photos else None,
                )

        if it.vehicle_id:
            v = db.query(Vehicle).filter(Vehicle.id == it.vehicle_id).first()
            if v:
                vehicle = VehicleInfo(
                    id=v.id, vehicle_type=v.vehicle_type, model=v.model,
                    reg_no=v.reg_no, seats=v.seats, is_ac=v.is_ac,
                    luggage_capacity=v.luggage_capacity,
                    facilities=v.facilities, photos=v.photos,
                )

        items.append(BookingItemOut(
            **{k: getattr(it, k) for k in
               ("id", "service_type", "package_id", "provider_id", "vehicle_id",
                "amount", "platform_fee", "provider_net", "provider_status",
                "trip_status")},
            provider=provider, package=package, vehicle=vehicle,
        ))

    destination = None
    if booking.destination_id:
        d = (db.query(Destination).options(joinedload(Destination.photos))
             .filter(Destination.id == booking.destination_id).first())
        if d:
            destination = DestinationInfo(
                id=d.id, name=d.name, slug=d.slug, region=d.region,
                photo=d.photos[0].url if d.photos else None,
            )

    traveler = None
    t = db.query(User).filter(User.id == booking.traveler_id).first()
    if t:
        traveler = TravelerInfo(
            id=t.id, full_name=t.full_name, phone=t.phone,
            email=t.email, country=t.country,
        )

    return BookingOut(
        **{k: getattr(booking, k) for k in
           ("id", "reference", "traveler_id", "booking_type", "status",
            "destination_id", "trip_plan_id", "start_date", "end_date",
            "start_time", "num_travelers", "pickup_location", "dropoff_location",
            "total_amount", "currency", "payment_status", "notes",
            "cancelled_reason")},
        items=items, destination=destination, traveler=traveler,
    )


@router.post("", response_model=BookingOut, status_code=201)
def create(data: BookingCreate,
           user: User = Depends(require_role(Role.TRAVELER)),
           db: Session = Depends(get_db)):
    booking = svc.create_booking(db, user, data)
    return _enrich(db, booking)


@router.get("", response_model=list[BookingOut])
def my_bookings(status: str | None = Query(None),
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    q = db.query(Booking).options(joinedload(Booking.items))

    if user.role == Role.TRAVELER:
        q = q.filter(Booking.traveler_id == user.id)
    elif user.role in (Role.GUIDE, Role.DRIVER):
        q = q.join(BookingItem).filter(BookingItem.provider_id == user.id)
    elif user.role != Role.ADMIN:
        raise HTTPException(403, "Not allowed")

    if status:
        q = q.filter(Booking.status == status.upper())

    rows = q.order_by(Booking.start_date.desc()).all()
    return [_enrich(db, b) for b in rows]


@router.get("/{booking_id}", response_model=BookingOut)
def detail(booking_id: UUID,
           user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    booking = (db.query(Booking).options(joinedload(Booking.items))
               .filter(Booking.id == booking_id).first())
    if not booking:
        raise HTTPException(404, "Booking not found")

    allowed = (user.role == Role.ADMIN
               or booking.traveler_id == user.id
               or any(i.provider_id == user.id for i in booking.items))
    if not allowed:
        raise HTTPException(403, "Not your booking")

    return _enrich(db, booking)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel(booking_id: UUID, data: CancelIn,
           user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.traveler_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(403, "Not your booking")
    svc.cancel_booking(db, booking, data.reason)
    return _enrich(db, booking)


@router.patch("/items/{item_id}/respond", response_model=BookingOut)
def respond(item_id: UUID, data: ProviderResponse,
            user: User = Depends(get_current_user),
            db: Session = Depends(get_db)):
    """Guide or driver accepts or declines a booking."""
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Provider account required")

    item = db.query(BookingItem).filter(BookingItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Booking item not found")
    if item.provider_id != user.id:
        raise HTTPException(403, "Not your booking")

    svc.respond_to_booking(db, item, data.accept, data.note)

    booking = (db.query(Booking).options(joinedload(Booking.items))
               .filter(Booking.id == item.booking_id).first())
    return _enrich(db, booking)


@router.patch("/items/{item_id}/trip-status", response_model=BookingOut)
def trip_status(item_id: UUID, data: StatusUpdate,
                user: User = Depends(require_role(Role.DRIVER)),
                db: Session = Depends(get_db)):
    item = db.query(BookingItem).filter(BookingItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Booking item not found")
    if item.provider_id != user.id:
        raise HTTPException(403, "Not your trip")
    if item.provider_status != "ACCEPTED":
        raise HTTPException(400, "Accept the booking before updating trip status")

    svc.update_trip_status(db, item, data.status.upper(), data.note)

    booking = (db.query(Booking).options(joinedload(Booking.items))
               .filter(Booking.id == item.booking_id).first())
    return _enrich(db, booking)