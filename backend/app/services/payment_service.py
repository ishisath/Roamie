from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.enums import BookingStatus, PaymentStatus
from app.models.booking import Booking
from app.models.payment import Payment, Refund
from app.models.user import User
from app.services import booking_service, notification_service
from app.services.payment_provider import get_provider


def create_intent(db: Session, traveler: User, booking_id) -> dict:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.traveler_id != traveler.id:
        raise HTTPException(403, "Not your booking")
    if booking.payment_status == PaymentStatus.SUCCESS:
        raise HTTPException(400, "Booking is already paid")
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(400, "Booking is cancelled")

    provider = get_provider()
    intent = provider.create_intent(
        Decimal(str(booking.total_amount)), booking.currency, booking.reference
    )

    commission = sum(
        (Decimal(str(i.platform_fee or 0)) for i in booking.items), Decimal("0")
    )

    payment = Payment(
        booking_id=booking.id,
        traveler_id=traveler.id,
        amount=booking.total_amount,
        currency=booking.currency,
        status=PaymentStatus.PENDING,
        provider=provider.name,
        platform_commission=commission,
        raw=intent,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "payment_id": payment.id,
        "intent_id": intent["intent_id"],
        "client_secret": intent.get("client_secret"),
        "amount": payment.amount,
        "currency": payment.currency,
        "status": intent["status"],
    }


def confirm_payment(db: Session, traveler: User, payment_id, intent_id) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.traveler_id != traveler.id:
        raise HTTPException(403, "Not your payment")
    if payment.status == PaymentStatus.SUCCESS:
        raise HTTPException(400, "Payment already completed")

    result = get_provider().confirm(intent_id)

    if result["status"] != "SUCCESS":
        payment.status = PaymentStatus.FAILED
        db.commit()
        raise HTTPException(402, "Payment failed or not yet completed")

    payment.status = PaymentStatus.SUCCESS
    payment.transaction_id = result["transaction_id"]
    payment.paid_at = datetime.now(timezone.utc)
    payment.raw = {**(payment.raw or {}), "confirm": result}

    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    booking.payment_status = PaymentStatus.SUCCESS
    booking_service.confirm_booking(db, booking)

    from app.services import budget_service
    budget_service.record_booking_expense(db, booking)

    notification_service.notify(
        db, booking.traveler_id, "BOOKING_CONFIRMED",
        "Booking confirmed",
        f"Your booking {booking.reference} is confirmed.",
        f"/bookings/{booking.id}",
    )
    notification_service.notify_many(
        db, [i.provider_id for i in booking.items], "NEW_BOOKING",
        "New confirmed booking",
        f"Booking {booking.reference} starting {booking.start_date}.",
        f"/provider/bookings/{booking.id}",
    )

    db.commit()
    db.refresh(payment)
    return payment


def refund_payment(db: Session, payment_id, amount, reason) -> Refund:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status != PaymentStatus.SUCCESS:
        raise HTTPException(400, "Only successful payments can be refunded")

    amount = Decimal(str(amount)) if amount else Decimal(str(payment.amount))
    if amount > Decimal(str(payment.amount)):
        raise HTTPException(400, "Refund exceeds payment amount")

    result = get_provider().refund(payment.transaction_id, amount)

    refund = Refund(
        payment_id=payment.id,
        amount=amount,
        status=PaymentStatus.SUCCESS if result["status"] == "SUCCESS"
        else PaymentStatus.FAILED,
        reason=reason,
        processed_at=datetime.now(timezone.utc),
    )
    db.add(refund)

    payment.status = PaymentStatus.REFUNDED
    booking = db.query(Booking).filter(Booking.id == payment.booking_id).first()
    booking.payment_status = PaymentStatus.REFUNDED

    from app.services import budget_service
    budget_service.remove_booking_expense(db, booking)

    notification_service.notify(
        db, payment.traveler_id, "REFUND_ISSUED", "Refund processed",
        f"{amount} {payment.currency} refunded for {booking.reference}.",
    )

    db.commit()
    db.refresh(refund)
    return refund