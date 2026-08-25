from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_role
from app.core.enums import BookingStatus, Role
from app.db.session import get_db
from app.models.booking import Booking, BookingItem
from app.models.user import User
from app.schemas.booking import (BookingCreate, BookingOut, CancelIn,
                                 StatusUpdate)
from app.services import booking_service as svc

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
def create(data: BookingCreate,
           user: User = Depends(require_role(Role.TRAVELER)),
           db: Session = Depends(get_db)):
    return svc.create_booking(db, user, data)


@router.get("", response_model=list[BookingOut])
def my_bookings(status: str | None = Query(None),
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Travelers see their own bookings; providers see bookings assigned to them."""
    q = db.query(Booking).options(joinedload(Booking.items))

    if user.role == Role.TRAVELER:
        q = q.filter(Booking.traveler_id == user.id)
    elif user.role in (Role.GUIDE, Role.DRIVER):
        q = q.join(BookingItem).filter(BookingItem.provider_id == user.id)
    elif user.role != Role.ADMIN:
        raise HTTPException(403, "Not allowed")

    if status:
        q = q.filter(Booking.status == status.upper())

    return q.order_by(Booking.start_date.desc()).all()


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
    return booking


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel(booking_id: UUID, data: CancelIn,
           user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.traveler_id != user.id and user.role != Role.ADMIN:
        raise HTTPException(403, "Not your booking")
    return svc.cancel_booking(db, booking, data.reason)


@router.patch("/items/{item_id}/trip-status", response_model=BookingOut)
def trip_status(item_id: UUID, data: StatusUpdate,
                user: User = Depends(require_role(Role.DRIVER)),
                db: Session = Depends(get_db)):
    item = db.query(BookingItem).filter(BookingItem.id == item_id).first()
    if not item:
        raise HTTPException(404, "Booking item not found")
    if item.provider_id != user.id:
        raise HTTPException(403, "Not your trip")
    svc.update_trip_status(db, item, data.status.upper(), data.note)
    return (db.query(Booking).options(joinedload(Booking.items))
            .filter(Booking.id == item.booking_id).first())