from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import AvailabilityStatus, Role
from app.core.security import (create_access_token, create_refresh_token,
                               decode_token, hash_password, verify_password)
from app.db.session import get_db
from app.models.package import Availability
from app.models.user import DriverProfile, GuideProfile, TravelerProfile, User
from app.schemas.auth import (LoginIn, ProfileUpdate, RefreshIn, RegisterIn,
                              TokenOut, UserOut)
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["auth"])

PUBLIC_ROLES = {Role.TRAVELER, Role.GUIDE, Role.DRIVER}
CALENDAR_DAYS = 90


def _tokens_for(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id), user.role),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    role = data.role.upper()
    if role not in PUBLIC_ROLES:
        raise HTTPException(400, "Invalid role")

    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(409, "That email is already registered")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=role,
        phone=data.phone,
        country=data.country,
    )
    db.add(user)
    db.flush()

    if role == Role.TRAVELER:
        db.add(TravelerProfile(user_id=user.id))
    else:
        if role == Role.GUIDE:
            db.add(GuideProfile(user_id=user.id))
        else:
            db.add(DriverProfile(user_id=user.id))

        # open a calendar so travellers can see availability straight away
        today = date.today()
        for i in range(CALENDAR_DAYS):
            db.add(Availability(
                provider_id=user.id,
                date=today + timedelta(days=i),
                status=AvailabilityStatus.AVAILABLE,
            ))

    db.commit()
    db.refresh(user)

    # welcome email — never blocks registration
    if role == Role.TRAVELER:
        email_service.send(
            to=user.email,
            subject="Welcome to Roamie",
            title=f"Welcome, {user.full_name.split()[0]}",
            body="Browse destinations, pick your own guide and driver, or let the "
                 "AI planner draft an itinerary. Roamie never chooses for you.",
            cta_text="Start planning", cta_path="/destinations",
        )
    else:
        email_service.send(
            to=user.email,
            subject="Your Roamie provider account",
            title=f"Thanks for joining, {user.full_name.split()[0]}",
            body="Complete your profile and an admin will review it. We'll email "
                 "you as soon as you're verified and can start taking bookings.",
            cta_text="Complete your profile", cta_path="/profile",
        )

    return _tokens_for(user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "That email and password don't match")
    if not user.is_active:
        raise HTTPException(403, "This account has been suspended")
    return _tokens_for(user)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    user = db.query(User).filter(User.id == UUID(payload["sub"])).first()
    if not user:
        raise HTTPException(401, "User not found")
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user