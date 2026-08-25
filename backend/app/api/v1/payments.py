from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user, require_role
from app.core.enums import BookingStatus, PaymentStatus, Role
from app.db.session import get_db
from app.models.booking import Booking, BookingItem
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (EarningsOut, PaymentConfirmIn, PaymentIntentIn,
                                 PaymentIntentOut, PaymentOut, RefundIn,
                                 RefundOut)
from app.services import payment_service as svc

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/config")
def payment_config():
    return {
        "provider": settings.PAYMENT_PROVIDER,
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
    }


@router.post("/intent", response_model=PaymentIntentOut, status_code=201)
def create_intent(data: PaymentIntentIn,
                  user: User = Depends(require_role(Role.TRAVELER)),
                  db: Session = Depends(get_db)):
    return svc.create_intent(db, user, data.booking_id)


@router.post("/confirm", response_model=PaymentOut)
def confirm(data: PaymentConfirmIn,
            user: User = Depends(require_role(Role.TRAVELER)),
            db: Session = Depends(get_db)):
    return svc.confirm_payment(db, user, data.payment_id, data.intent_id)


@router.get("", response_model=list[PaymentOut])
def my_payments(user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    q = db.query(Payment)
    if user.role == Role.TRAVELER:
        q = q.filter(Payment.traveler_id == user.id)
    elif user.role != Role.ADMIN:
        raise HTTPException(403, "Not allowed")
    return q.order_by(Payment.created_at.desc()).all()


@router.post("/refund", response_model=RefundOut, status_code=201)
def refund(data: RefundIn,
           user: User = Depends(require_role(Role.ADMIN)),
           db: Session = Depends(get_db)):
    return svc.refund_payment(db, data.payment_id, data.amount, data.reason)


@router.get("/earnings", response_model=EarningsOut)
def earnings(user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Provider account required")

    items = (db.query(BookingItem)
             .join(Booking)
             .filter(BookingItem.provider_id == user.id,
                     Booking.status != BookingStatus.CANCELLED)
             .all())

    total = pending = completed = commission = Decimal("0")
    monthly = defaultdict(Decimal)

    for it in items:
        net = Decimal(str(it.provider_net or 0))
        total += net
        commission += Decimal(str(it.platform_fee or 0))
        if it.booking.payment_status == PaymentStatus.SUCCESS:
            completed += net
            monthly[it.booking.start_date.strftime("%Y-%m")] += net
        else:
            pending += net

    return EarningsOut(
        total_earnings=total,
        pending_payments=pending,
        completed_payments=completed,
        platform_commission=commission,
        net_earnings=total,
        bookings_count=len(items),
        monthly=[{"month": k, "amount": float(v)} for k, v in sorted(monthly.items())],
    )