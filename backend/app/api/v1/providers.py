from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.enums import (AvailabilityStatus, ContentStatus, Role,
                            VerificationStatus)
from app.db.session import get_db
from app.models.package import Availability, Package
from app.models.user import DriverProfile, GuideProfile, User, Vehicle
from app.schemas.provider import (PackageBrief, ProviderCard, ProviderProfile,
                                  VehicleBrief)

router = APIRouter(prefix="/providers", tags=["providers"])


def _free_dates(db: Session, user_id, days: int = 60) -> list[date]:
    today = date.today()
    rows = (db.query(Availability)
            .filter(Availability.provider_id == user_id,
                    Availability.date >= today,
                    Availability.date <= today + timedelta(days=days),
                    Availability.status == AvailabilityStatus.AVAILABLE)
            .order_by(Availability.date).all())
    return [r.date for r in rows]


@router.get("/guides", response_model=list[ProviderCard])
def list_guides(q: str | None = None,
                language: str | None = None,
                specialization: str | None = None,
                min_rating: float | None = None,
                min_experience: int | None = None,
                sort: str = Query("rating", pattern="^(rating|experience|name)$"),
                db: Session = Depends(get_db)):
    query = (db.query(GuideProfile, User)
             .join(User, User.id == GuideProfile.user_id)
             .filter(GuideProfile.verification_status == VerificationStatus.APPROVED,
                     User.is_active.is_(True)))

    if q:
        query = query.filter(or_(User.full_name.ilike(f"%{q}%"),
                                 GuideProfile.bio.ilike(f"%{q}%")))
    if language:
        query = query.filter(GuideProfile.languages.any(language))
    if specialization:
        query = query.filter(GuideProfile.specializations.any(specialization))
    if min_rating is not None:
        query = query.filter(GuideProfile.rating_avg >= min_rating)
    if min_experience is not None:
        query = query.filter(GuideProfile.years_experience >= min_experience)

    order = {
        "rating": GuideProfile.rating_avg.desc(),
        "experience": GuideProfile.years_experience.desc(),
        "name": User.full_name.asc(),
    }[sort]

    rows = query.order_by(order).limit(50).all()

    return [ProviderCard(
        user_id=u.id, full_name=u.full_name, avatar_url=u.avatar_url,
        country=u.country, bio=p.bio, years_experience=p.years_experience,
        languages=p.languages, specializations=p.specializations,
        rating_avg=p.rating_avg, rating_count=p.rating_count,
        is_verified=True,
    ) for p, u in rows]


@router.get("/drivers", response_model=list[ProviderCard])
def list_drivers(q: str | None = None,
                 language: str | None = None,
                 min_seats: int | None = None,
                 is_ac: bool | None = None,
                 min_rating: float | None = None,
                 sort: str = Query("rating", pattern="^(rating|experience|name)$"),
                 db: Session = Depends(get_db)):
    query = (db.query(DriverProfile, User)
             .join(User, User.id == DriverProfile.user_id)
             .filter(DriverProfile.verification_status == VerificationStatus.APPROVED,
                     User.is_active.is_(True)))

    if q:
        query = query.filter(or_(User.full_name.ilike(f"%{q}%"),
                                 DriverProfile.bio.ilike(f"%{q}%")))
    if language:
        query = query.filter(DriverProfile.languages.any(language))
    if min_rating is not None:
        query = query.filter(DriverProfile.rating_avg >= min_rating)

    order = {
        "rating": DriverProfile.rating_avg.desc(),
        "experience": DriverProfile.years_experience.desc(),
        "name": User.full_name.asc(),
    }[sort]

    rows = query.order_by(order).limit(50).all()

    out = []
    for p, u in rows:
        vehicles = (db.query(Vehicle)
                    .filter(Vehicle.driver_id == p.id,
                            Vehicle.is_active.is_(True)).all())

        # vehicle filters apply to the driver's fleet
        if min_seats and not any(v.seats >= min_seats for v in vehicles):
            continue
        if is_ac is not None and not any(v.is_ac == is_ac for v in vehicles):
            continue

        summary = None
        if vehicles:
            v = vehicles[0]
            summary = (f"{v.vehicle_type} · {v.seats} seats · "
                       f"{'AC' if v.is_ac else 'Non-AC'}")
            if len(vehicles) > 1:
                summary += f" (+{len(vehicles) - 1} more)"

        out.append(ProviderCard(
            user_id=u.id, full_name=u.full_name, avatar_url=u.avatar_url,
            country=u.country, bio=p.bio, years_experience=p.years_experience,
            languages=p.languages, rating_avg=p.rating_avg,
            rating_count=p.rating_count, is_verified=True,
            vehicle_summary=summary,
        ))
    return out


@router.get("/{user_id}", response_model=ProviderProfile)
def provider_profile(user_id: UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user or user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(404, "Provider not found")

    base = dict(user_id=user.id, full_name=user.full_name,
                avatar_url=user.avatar_url, country=user.country,
                available_dates=_free_dates(db, user.id))

    if user.role == Role.GUIDE:
        p = db.query(GuideProfile).filter(GuideProfile.user_id == user.id).first()
        if not p or p.verification_status != VerificationStatus.APPROVED:
            raise HTTPException(404, "Provider not found")

        packages = (db.query(Package)
                    .filter(Package.guide_id == p.id,
                            Package.status == ContentStatus.ACTIVE).all())

        return ProviderProfile(
            **base, bio=p.bio, years_experience=p.years_experience,
            languages=p.languages, specializations=p.specializations,
            qualifications=p.qualifications, certifications=p.certifications,
            rating_avg=p.rating_avg, rating_count=p.rating_count,
            is_verified=True,
            packages=[PackageBrief(
                id=pk.id, title=pk.title, duration_days=pk.duration_days,
                price=pk.price, currency=pk.currency,
                transport_included=pk.transport_included,
                rating_avg=pk.rating_avg,
            ) for pk in packages],
        )

    p = db.query(DriverProfile).filter(DriverProfile.user_id == user.id).first()
    if not p or p.verification_status != VerificationStatus.APPROVED:
        raise HTTPException(404, "Provider not found")

    vehicles = (db.query(Vehicle)
                .filter(Vehicle.driver_id == p.id,
                        Vehicle.is_active.is_(True)).all())

    return ProviderProfile(
        **base, bio=p.bio, years_experience=p.years_experience,
        languages=p.languages, license_no=p.license_no,
        rating_avg=p.rating_avg, rating_count=p.rating_count,
        is_verified=True,
        vehicles=[VehicleBrief(
            id=v.id, vehicle_type=v.vehicle_type, model=v.model,
            seats=v.seats, is_ac=v.is_ac, luggage_capacity=v.luggage_capacity,
            facilities=v.facilities, photos=v.photos,
        ) for v in vehicles],
    )