from sqlalchemy import (Boolean, Column, Date, ForeignKey, Integer, Numeric,
                        String, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.enums import Role, VerificationStatus
from app.db.base_class import Base, TimestampMixin, pk


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = pk()
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=Role.TRAVELER, index=True)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(30))
    avatar_url = Column(Text)
    country = Column(String(80))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    traveler_profile = relationship("TravelerProfile", back_populates="user", uselist=False)
    guide_profile = relationship("GuideProfile", back_populates="user", uselist=False)
    driver_profile = relationship("DriverProfile", back_populates="user", uselist=False)


class TravelerProfile(Base, TimestampMixin):
    __tablename__ = "traveler_profiles"

    id = pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                     unique=True, nullable=False)
    preferences = Column(JSONB, default=dict)
    interests = Column(ARRAY(String))

    user = relationship("User", back_populates="traveler_profile")


class GuideProfile(Base, TimestampMixin):
    __tablename__ = "guide_profiles"

    id = pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                     unique=True, nullable=False)
    bio = Column(Text)
    years_experience = Column(Integer, default=0)
    languages = Column(ARRAY(String))
    specializations = Column(ARRAY(String))
    qualifications = Column(Text)
    certifications = Column(Text)
    verification_status = Column(String(25), default=VerificationStatus.PENDING, index=True)
    verification_docs = Column(JSONB, default=list)
    admin_note = Column(Text)
    rating_avg = Column(Numeric(3, 2), default=0)
    rating_count = Column(Integer, default=0)

    user = relationship("User", back_populates="guide_profile")


class DriverProfile(Base, TimestampMixin):
    __tablename__ = "driver_profiles"

    id = pk()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
                     unique=True, nullable=False)
    bio = Column(Text)
    years_experience = Column(Integer, default=0)
    languages = Column(ARRAY(String))
    license_no = Column(String(60))
    license_expiry = Column(Date)
    verification_status = Column(String(25), default=VerificationStatus.PENDING, index=True)
    verification_docs = Column(JSONB, default=list)
    admin_note = Column(Text)
    rating_avg = Column(Numeric(3, 2), default=0)
    rating_count = Column(Integer, default=0)

    user = relationship("User", back_populates="driver_profile")
    vehicles = relationship("Vehicle", back_populates="driver")


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id = pk()
    driver_id = Column(UUID(as_uuid=True), ForeignKey("driver_profiles.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False)
    model = Column(String(100))
    reg_no = Column(String(40), unique=True, nullable=False)
    seats = Column(Integer, nullable=False, default=4)
    is_ac = Column(Boolean, default=True)
    luggage_capacity = Column(String(60))
    facilities = Column(ARRAY(String))
    photos = Column(ARRAY(String))
    verification_status = Column(String(25), default=VerificationStatus.PENDING)
    is_active = Column(Boolean, default=True)

    driver = relationship("DriverProfile", back_populates="vehicles")