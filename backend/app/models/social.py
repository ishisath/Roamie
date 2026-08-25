from sqlalchemy import (Boolean, Column, DateTime, ForeignKey, Integer,
                        String, Text)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.core.enums import ContentStatus, ReportStatus
from app.db.base_class import Base, TimestampMixin, pk


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id = pk()
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="CASCADE"),
                        nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), index=True)
    read_at = Column(DateTime(timezone=True))


class Review(Base, TimestampMixin):
    __tablename__ = "reviews"

    id = pk()
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False, index=True)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    subject_type = Column(String(20), nullable=False)
    subject_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    criteria = Column(JSONB, default=dict)
    status = Column(String(20), default=ContentStatus.ACTIVE, index=True)


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id = pk()
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    target_type = Column(String(30), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    reason = Column(String(120), nullable=False)
    description = Column(Text)
    status = Column(String(20), default=ReportStatus.OPEN, index=True)
    admin_note = Column(Text)
    resolved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    resolved_at = Column(DateTime(timezone=True))


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                     nullable=False, index=True)
    type = Column(String(40), nullable=False)
    title = Column(String(180), nullable=False)
    body = Column(Text)
    link = Column(String(255))
    is_read = Column(Boolean, default=False, index=True)