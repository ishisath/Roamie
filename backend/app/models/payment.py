from sqlalchemy import (Column, Date, DateTime, ForeignKey, Numeric, String,
                        Text)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.enums import ExpenseCategory, PaymentStatus
from app.db.base_class import Base, TimestampMixin, pk


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id = pk()
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, index=True)
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(5), default="LKR")
    status = Column(String(20), default=PaymentStatus.PENDING, nullable=False, index=True)
    provider = Column(String(40), default="MOCK")
    transaction_id = Column(String(120), index=True)
    paid_at = Column(DateTime(timezone=True))
    platform_commission = Column(Numeric(10, 2), default=0)
    raw = Column(JSONB, default=dict)

    refunds = relationship("Refund", back_populates="payment")


class Refund(Base, TimestampMixin):
    __tablename__ = "refunds"

    id = pk()
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default=PaymentStatus.PENDING)
    reason = Column(Text)
    processed_at = Column(DateTime(timezone=True))

    payment = relationship("Payment", back_populates="refunds")


class TripBudget(Base, TimestampMixin):
    __tablename__ = "trip_budgets"

    id = pk()
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    trip_plan_id = Column(UUID(as_uuid=True), ForeignKey("trip_plans.id"))
    title = Column(String(150), nullable=False)
    total_budget = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(5), default="LKR")
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(String(10), default="true")

    expenses = relationship("Expense", back_populates="budget",
                            cascade="all, delete-orphan")


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id = pk()
    budget_id = Column(UUID(as_uuid=True), ForeignKey("trip_budgets.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    traveler_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(30), default=ExpenseCategory.OTHER, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    note = Column(String(255))
    spent_on = Column(Date, nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"))

    budget = relationship("TripBudget", back_populates="expenses")