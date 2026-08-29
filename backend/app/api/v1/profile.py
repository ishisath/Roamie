from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import Role, VerificationStatus
from app.db.session import get_db
from app.models.user import DriverProfile, GuideProfile, User
from app.schemas.profile import (DriverProfileUpdate, GuideProfileUpdate,
                                 ProfileOut, UserUpdate)
from app.services import notification_service

router = APIRouter(prefix="/profile", tags=["profile"])

GUIDE_REQUIRED = [
    ("bio", "A short bio"),
    ("years_experience", "Years of experience"),
    ("languages", "Languages you speak"),
    ("specializations", "What you specialise in"),
    ("qualifications", "Your qualifications"),
    ("daily_rate", "Your day rate"),
    ("verification_docs", "Verification documents"),
]

DRIVER_REQUIRED = [
    ("bio", "A short bio"),
    ("years_experience", "Years of experience"),
    ("languages", "Languages you speak"),
    ("license_no", "Your licence number"),
    ("license_expiry", "Licence expiry date"),
    ("daily_rate", "Your day rate"),
    ("verification_docs", "Verification documents"),
]


def _completeness(profile, user, required) -> tuple[int, list[str]]:
    missing = []
    done = 0

    for field, label in required:
        value = getattr(profile, field, None)
        if value in (None, "", [], 0):
            missing.append(label)
        else:
            done += 1

    if not user.avatar_url:
        missing.append("A profile photo")
    else:
        done += 1

    if not user.phone:
        missing.append("A phone number")
    else:
        done += 1

    total = len(required) + 2
    return round(done / total * 100), missing


def _profile_for(db: Session, user: User):
    if user.role == Role.GUIDE:
        return db.query(GuideProfile).filter_by(user_id=user.id).first(), GUIDE_REQUIRED
    if user.role == Role.DRIVER:
        return db.query(DriverProfile).filter_by(user_id=user.id).first(), DRIVER_REQUIRED
    raise HTTPException(403, "Provider account required")


def _serialise(profile, user, required) -> ProfileOut:
    pct, missing = _completeness(profile, user, required)
    return ProfileOut(
        id=profile.id, user_id=user.id,
        full_name=user.full_name, email=user.email,
        phone=user.phone, country=user.country, avatar_url=user.avatar_url,
        bio=profile.bio,
        years_experience=profile.years_experience,
        languages=profile.languages,
        specializations=getattr(profile, "specializations", None),
        qualifications=getattr(profile, "qualifications", None),
        certifications=getattr(profile, "certifications", None),
        sltda_registered=getattr(profile, "sltda_registered", None),
        sltda_number=getattr(profile, "sltda_number", None),
        license_no=getattr(profile, "license_no", None),
        license_expiry=getattr(profile, "license_expiry", None),
        daily_rate=profile.daily_rate,
        verification_docs=profile.verification_docs,
        verification_status=profile.verification_status,
        admin_note=profile.admin_note,
        rating_avg=profile.rating_avg,
        rating_count=profile.rating_count,
        completeness=pct, missing=missing,
    )


@router.get("/me", response_model=ProfileOut)
def my_profile(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    profile, required = _profile_for(db, user)
    if not profile:
        raise HTTPException(404, "Profile not found")
    return _serialise(profile, user, required)


@router.patch("/me/guide", response_model=ProfileOut)
def update_guide(data: GuideProfileUpdate,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    if user.role != Role.GUIDE:
        raise HTTPException(403, "Guide account required")

    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)

    # editing after a rejection puts you back in the queue
    if profile.verification_status in (VerificationStatus.REJECTED,
                                       VerificationStatus.CHANGES_REQUESTED):
        profile.verification_status = VerificationStatus.PENDING

    db.commit()
    db.refresh(profile)
    return _serialise(profile, user, GUIDE_REQUIRED)


@router.patch("/me/driver", response_model=ProfileOut)
def update_driver(data: DriverProfileUpdate,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if user.role != Role.DRIVER:
        raise HTTPException(403, "Driver account required")

    profile = db.query(DriverProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(404, "Profile not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)

    if profile.verification_status in (VerificationStatus.REJECTED,
                                       VerificationStatus.CHANGES_REQUESTED):
        profile.verification_status = VerificationStatus.PENDING

    db.commit()
    db.refresh(profile)
    return _serialise(profile, user, DRIVER_REQUIRED)


@router.patch("/me/account", response_model=ProfileOut)
def update_account(data: UserUpdate,
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Name, phone, country and photo — shared by all roles."""
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)

    profile, required = _profile_for(db, user)
    return _serialise(profile, user, required)


@router.post("/me/submit", response_model=ProfileOut)
def submit_for_verification(user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    profile, required = _profile_for(db, user)
    if not profile:
        raise HTTPException(404, "Profile not found")

    pct, missing = _completeness(profile, user, required)
    if missing:
        raise HTTPException(
            400,
            f"Still needed before you can submit: {', '.join(missing[:3])}"
            + (f" and {len(missing) - 3} more" if len(missing) > 3 else ""),
        )

    profile.verification_status = VerificationStatus.PENDING
    db.commit()

    admins = db.query(User).filter(User.role == Role.ADMIN).all()
    notification_service.notify_many(
        db, [a.id for a in admins], "VERIFICATION_REQUEST",
        f"{user.full_name} submitted for verification",
        f"A {user.role.lower()} profile is ready for review.",
        "/admin",
    )
    db.commit()

    return _serialise(profile, user, required)