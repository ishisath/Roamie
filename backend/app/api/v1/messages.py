from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import BookingStatus, Role
from app.db.session import get_db
from app.models.booking import Booking, BookingItem
from app.models.social import Message
from app.models.user import User
from app.schemas.message import MessageCreate, MessageOut, ThreadOut
from app.services import notification_service

router = APIRouter(prefix="/messages", tags=["messages"])

OPEN_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.COMPLETED)


def _participants(db: Session, booking_id, user: User):
    """Returns (booking, other_party_user_id) or raises."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")

    provider_ids = [i.provider_id for i in booking.items if i.provider_id]

    if booking.traveler_id == user.id:
        if not provider_ids:
            raise HTTPException(400, "No provider on this booking yet")
        other = provider_ids[0]
    elif user.id in provider_ids:
        other = booking.traveler_id
    else:
        raise HTTPException(403, "You are not part of this booking")

    if booking.status not in OPEN_STATUSES:
        raise HTTPException(403, "Messaging opens once the booking is confirmed")

    return booking, other


@router.get("/threads", response_model=list[ThreadOut])
def list_threads(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == Role.TRAVELER:
        bookings = (db.query(Booking)
                    .filter(Booking.traveler_id == user.id,
                            Booking.status.in_(OPEN_STATUSES)).all())
    else:
        bookings = (db.query(Booking).join(BookingItem)
                    .filter(BookingItem.provider_id == user.id,
                            Booking.status.in_(OPEN_STATUSES)).all())

    threads = []
    for b in bookings:
        provider_ids = [i.provider_id for i in b.items if i.provider_id]
        other_id = provider_ids[0] if b.traveler_id == user.id else b.traveler_id
        if not other_id:
            continue

        other = db.query(User).filter(User.id == other_id).first()
        if not other:
            continue

        last = (db.query(Message)
                .filter(Message.booking_id == b.id)
                .order_by(Message.created_at.desc()).first())

        unread = (db.query(Message)
                  .filter(Message.booking_id == b.id,
                          Message.receiver_id == user.id,
                          Message.read_at.is_(None)).count())

        threads.append(ThreadOut(
            booking_id=b.id, reference=b.reference,
            other_party_id=other.id, other_party_name=other.full_name,
            other_party_role=other.role,
            last_message=last.body if last else None,
            last_sent_at=last.sent_at if last else None,
            unread=unread,
        ))

    threads.sort(key=lambda t: t.last_sent_at or datetime.min.replace(tzinfo=timezone.utc),
                 reverse=True)
    return threads


@router.get("/unread/count")
def unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = (db.query(Message)
             .filter(Message.receiver_id == user.id,
                     Message.read_at.is_(None)).count())
    return {"count": count}


@router.get("/{booking_id}", response_model=list[MessageOut])
def get_messages(booking_id: UUID,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    _participants(db, booking_id, user)

    messages = (db.query(Message)
                .filter(Message.booking_id == booking_id)
                .order_by(Message.created_at).all())

    unread = [m for m in messages if m.receiver_id == user.id and m.read_at is None]
    if unread:
        now = datetime.now(timezone.utc)
        for m in unread:
            m.read_at = now
        db.commit()

    return messages


@router.post("/{booking_id}", response_model=MessageOut, status_code=201)
def send_message(booking_id: UUID, data: MessageCreate,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    booking, other_id = _participants(db, booking_id, user)

    msg = Message(
        booking_id=booking.id,
        sender_id=user.id,
        receiver_id=other_id,
        body=data.body.strip(),
        sent_at=datetime.now(timezone.utc),
    )
    db.add(msg)

    notification_service.notify(
        db, other_id, "NEW_MESSAGE", f"Message from {user.full_name}",
        data.body[:100], f"/messages/{booking.id}",
    )

    db.commit()
    db.refresh(msg)
    return msg