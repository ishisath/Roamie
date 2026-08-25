from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PaymentIntentIn(BaseModel):
    booking_id: UUID


class PaymentIntentOut(BaseModel):
    payment_id: UUID
    intent_id: str
    client_secret: str | None = None
    amount: Decimal
    currency: str
    status: str


class PaymentConfirmIn(BaseModel):
    payment_id: UUID
    intent_id: str


class PaymentOut(BaseModel):
    id: UUID
    booking_id: UUID
    amount: Decimal
    currency: str
    status: str
    provider: str
    transaction_id: str | None = None
    paid_at: datetime | None = None
    platform_commission: Decimal | None = None
    model_config = {"from_attributes": True}


class RefundIn(BaseModel):
    payment_id: UUID
    amount: Decimal | None = None
    reason: str | None = None


class RefundOut(BaseModel):
    id: UUID
    payment_id: UUID
    amount: Decimal
    status: str
    reason: str | None = None
    model_config = {"from_attributes": True}


class EarningsOut(BaseModel):
    total_earnings: Decimal
    pending_payments: Decimal
    completed_payments: Decimal
    platform_commission: Decimal
    net_earnings: Decimal
    bookings_count: int
    monthly: list[dict]