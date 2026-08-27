from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.enums import (BookingStatus, ContentStatus, PaymentStatus,
                            ReportStatus, Role, SuggestionKind,
                            VerificationStatus)
from app.db.session import get_db
from app.models.booking import Booking
from app.models.destination import (Destination, DestinationPhoto,
                                    DestinationSuggestion)
from app.models.package import Package
from app.models.payment import Payment
from app.models.social import Report
from app.models.user import DriverProfile, GuideProfile, User, Vehicle
from app.schemas.admin import (AdminUserOut, AnalyticsOut, ReportAction,
                               ReportOut, SuggestionOut, UserAction,
                               VerificationAction)
from app.services import notification_service
from app.schemas.destination import DestinationCreate, DestinationUpdate
from sqlalchemy.orm import Session, joinedload
from app.models.destination import (Destination, DestinationPhoto,
                                    DestinationSuggestion)

router = APIRouter(prefix="/admin", tags=["admin"],
                   dependencies=[Depends(require_role(Role.ADMIN))])


def _slugify(name: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")


# ---------- analytics ----------

@router.get("/analytics", response_model=AnalyticsOut)
def analytics(db: Session = Depends(get_db)):
    def count(model, *filters):
        q = db.query(func.count(model.id))
        for f in filters:
            q = q.filter(f)
        return q.scalar() or 0

    revenue = (db.query(func.coalesce(func.sum(Payment.amount), 0))
               .filter(Payment.status == PaymentStatus.SUCCESS).scalar())
    commission = (db.query(func.coalesce(func.sum(Payment.platform_commission), 0))
                  .filter(Payment.status == PaymentStatus.SUCCESS).scalar())

    top_dest = (db.query(Destination.name, Destination.search_count,
                         Destination.booking_count)
                .filter(Destination.status == ContentStatus.ACTIVE)
                .order_by(Destination.search_count.desc()).limit(5).all())

    top_pkg = (db.query(Package.title, Package.booking_count, Package.rating_avg)
               .order_by(Package.booking_count.desc()).limit(5).all())

    monthly = defaultdict(int)
    for b in db.query(Booking.start_date).all():
        if b.start_date:
            monthly[b.start_date.strftime("%Y-%m")] += 1

    return AnalyticsOut(
        travelers=count(User, User.role == Role.TRAVELER),
        guides=count(User, User.role == Role.GUIDE),
        drivers=count(User, User.role == Role.DRIVER),
        pending_guides=count(GuideProfile,
                             GuideProfile.verification_status == VerificationStatus.PENDING),
        pending_drivers=count(DriverProfile,
                              DriverProfile.verification_status == VerificationStatus.PENDING),
        pending_vehicles=count(Vehicle,
                               Vehicle.verification_status == VerificationStatus.PENDING),
        destinations=count(Destination, Destination.status == ContentStatus.ACTIVE),
        packages=count(Package, Package.status == ContentStatus.ACTIVE),
        bookings=count(Booking),
        completed_bookings=count(Booking, Booking.status == BookingStatus.COMPLETED),
        cancelled_bookings=count(Booking, Booking.status == BookingStatus.CANCELLED),
        revenue=Decimal(str(revenue)),
        commission=Decimal(str(commission)),
        pending_suggestions=count(DestinationSuggestion,
                                  DestinationSuggestion.status == VerificationStatus.PENDING),
        open_reports=count(Report, Report.status == ReportStatus.OPEN),
        popular_destinations=[
            {"name": n, "searches": s or 0, "bookings": b or 0} for n, s, b in top_dest
        ],
        popular_packages=[
            {"title": t, "bookings": b or 0, "rating": float(r or 0)} for t, b, r in top_pkg
        ],
        monthly_bookings=[{"month": k, "count": v} for k, v in sorted(monthly.items())],
    )


# ---------- users ----------

@router.get("/users", response_model=list[AdminUserOut])
def list_users(role: str | None = None, q: str | None = None,
               db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role.upper())
    if q:
        query = query.filter(User.full_name.ilike(f"%{q}%") | User.email.ilike(f"%{q}%"))

    users = query.order_by(User.created_at.desc()).limit(200).all()

    out = []
    for u in users:
        status = None
        if u.role == Role.GUIDE and u.guide_profile:
            status = u.guide_profile.verification_status
        elif u.role == Role.DRIVER and u.driver_profile:
            status = u.driver_profile.verification_status
        out.append(AdminUserOut(
            **{k: getattr(u, k) for k in
               ("id", "email", "full_name", "role", "phone", "country",
                "is_active", "is_verified", "created_at")},
            verification_status=status,
        ))
    return out


@router.patch("/users/{user_id}/status", response_model=AdminUserOut)
def set_user_status(user_id: UUID, data: UserAction, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    if u.role == Role.ADMIN:
        raise HTTPException(400, "Cannot deactivate an admin account")

    u.is_active = data.is_active
    notification_service.notify(
        db, u.id, "ACCOUNT_STATUS",
        "Account activated" if data.is_active else "Account suspended",
        data.note,
    )
    db.commit()
    db.refresh(u)
    return AdminUserOut(
        **{k: getattr(u, k) for k in
           ("id", "email", "full_name", "role", "phone", "country",
            "is_active", "is_verified", "created_at")},
        verification_status=None,
    )


# ---------- verification ----------

@router.get("/verifications/guides")
def pending_guides(status: str = VerificationStatus.PENDING,
                   db: Session = Depends(get_db)):
    rows = (db.query(GuideProfile, User)
            .join(User, User.id == GuideProfile.user_id)
            .filter(GuideProfile.verification_status == status).all())
    return [{
        "profile_id": str(p.id), "user_id": str(u.id),
        "full_name": u.full_name, "email": u.email, "phone": u.phone,
        "bio": p.bio, "years_experience": p.years_experience,
        "languages": p.languages, "specializations": p.specializations,
        "qualifications": p.qualifications, "certifications": p.certifications,
        "verification_docs": p.verification_docs,
        "status": p.verification_status,
    } for p, u in rows]


@router.get("/verifications/drivers")
def pending_drivers(status: str = VerificationStatus.PENDING,
                    db: Session = Depends(get_db)):
    rows = (db.query(DriverProfile, User)
            .join(User, User.id == DriverProfile.user_id)
            .filter(DriverProfile.verification_status == status).all())
    return [{
        "profile_id": str(p.id), "user_id": str(u.id),
        "full_name": u.full_name, "email": u.email, "phone": u.phone,
        "bio": p.bio, "years_experience": p.years_experience,
        "languages": p.languages, "license_no": p.license_no,
        "license_expiry": p.license_expiry,
        "verification_docs": p.verification_docs,
        "status": p.verification_status,
    } for p, u in rows]


@router.patch("/verifications/guides/{profile_id}")
def verify_guide(profile_id: UUID, data: VerificationAction,
                 db: Session = Depends(get_db)):
    p = db.query(GuideProfile).filter(GuideProfile.id == profile_id).first()
    if not p:
        raise HTTPException(404, "Guide profile not found")
    return _apply_verification(db, p, p.user_id, data, "guide")


@router.patch("/verifications/drivers/{profile_id}")
def verify_driver(profile_id: UUID, data: VerificationAction,
                  db: Session = Depends(get_db)):
    p = db.query(DriverProfile).filter(DriverProfile.id == profile_id).first()
    if not p:
        raise HTTPException(404, "Driver profile not found")
    return _apply_verification(db, p, p.user_id, data, "driver")


def _apply_verification(db, profile, user_id, data, label):
    mapping = {
        "APPROVE": VerificationStatus.APPROVED,
        "REJECT": VerificationStatus.REJECTED,
        "REQUEST_CHANGES": VerificationStatus.CHANGES_REQUESTED,
    }
    new_status = mapping.get(data.action.upper())
    if not new_status:
        raise HTTPException(400, "Action must be APPROVE, REJECT or REQUEST_CHANGES")

    profile.verification_status = new_status
    profile.admin_note = data.note

    if new_status == VerificationStatus.APPROVED:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.is_verified = True

    titles = {
        VerificationStatus.APPROVED: f"Your {label} account is verified",
        VerificationStatus.REJECTED: f"Your {label} verification was rejected",
        VerificationStatus.CHANGES_REQUESTED: "More information needed",
    }
    notification_service.notify(db, user_id, "VERIFICATION",
                                titles[new_status], data.note)
    db.commit()
    return {"status": new_status}


@router.get("/verifications/vehicles")
def pending_vehicles(db: Session = Depends(get_db)):
    rows = (db.query(Vehicle, DriverProfile, User)
            .join(DriverProfile, DriverProfile.id == Vehicle.driver_id)
            .join(User, User.id == DriverProfile.user_id)
            .filter(Vehicle.verification_status == VerificationStatus.PENDING).all())
    return [{
        "id": str(v.id), "driver_name": u.full_name,
        "vehicle_type": v.vehicle_type, "model": v.model, "reg_no": v.reg_no,
        "seats": v.seats, "is_ac": v.is_ac,
        "luggage_capacity": v.luggage_capacity, "facilities": v.facilities,
        "photos": v.photos,
    } for v, p, u in rows]


@router.patch("/verifications/vehicles/{vehicle_id}")
def verify_vehicle(vehicle_id: UUID, data: VerificationAction,
                   db: Session = Depends(get_db)):
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(404, "Vehicle not found")

    mapping = {"APPROVE": VerificationStatus.APPROVED,
               "REJECT": VerificationStatus.REJECTED}
    new_status = mapping.get(data.action.upper())
    if not new_status:
        raise HTTPException(400, "Action must be APPROVE or REJECT")

    v.verification_status = new_status
    profile = db.query(DriverProfile).filter(DriverProfile.id == v.driver_id).first()
    if profile:
        notification_service.notify(
            db, profile.user_id, "VEHICLE_VERIFICATION",
            f"Vehicle {v.reg_no} {'approved' if new_status == 'APPROVED' else 'rejected'}",
            data.note,
        )
    db.commit()
    return {"status": new_status}


# ---------- destination suggestions ----------

@router.get("/suggestions", response_model=list[SuggestionOut])
def list_suggestions(status: str = VerificationStatus.PENDING,
                     db: Session = Depends(get_db)):
    rows = (db.query(DestinationSuggestion)
            .filter(DestinationSuggestion.status == status)
            .order_by(DestinationSuggestion.created_at.desc()).all())

    out = []
    for s in rows:
        submitter = db.query(User).filter(User.id == s.submitted_by).first()
        out.append(SuggestionOut(
            **{k: getattr(s, k) for k in
               ("id", "kind", "submitted_by", "target_destination_id", "name",
                "region", "lat", "lng", "description", "why_popular",
                "activities", "photos", "status", "admin_note", "created_at")},
            submitter_name=submitter.full_name if submitter else None,
        ))
    return out


@router.patch("/suggestions/{suggestion_id}")
def review_suggestion(suggestion_id: UUID, data: VerificationAction,
                      admin: User = Depends(require_role(Role.ADMIN)),
                      db: Session = Depends(get_db)):
    s = db.query(DestinationSuggestion).filter(
        DestinationSuggestion.id == suggestion_id).first()
    if not s:
        raise HTTPException(404, "Suggestion not found")

    action = data.action.upper()
    s.reviewed_by = admin.id
    s.reviewed_at = datetime.now(timezone.utc)
    s.admin_note = data.note

    if action == "REJECT":
        s.status = VerificationStatus.REJECTED
        notification_service.notify(
            db, s.submitted_by, "SUGGESTION_REVIEWED",
            "Your destination suggestion was not approved", data.note)
        db.commit()
        return {"status": s.status}

    if action != "APPROVE":
        raise HTTPException(400, "Action must be APPROVE or REJECT")

    s.status = VerificationStatus.APPROVED

    if s.kind == SuggestionKind.NEW:
        slug = _slugify(s.name or "destination")
        if db.query(Destination).filter(Destination.slug == slug).first():
            slug = f"{slug}-{str(s.id)[:6]}"

        dest = Destination(
            name=s.name, slug=slug, description=s.description,
            region=s.region, lat=s.lat, lng=s.lng,
            category_id=s.category_id, activities=s.activities,
            other_info=s.why_popular, status=ContentStatus.ACTIVE,
            created_by=s.submitted_by,
        )
        db.add(dest)
        db.flush()
        for i, url in enumerate(s.photos or []):
            db.add(DestinationPhoto(destination_id=dest.id, url=url, sort_order=i))
        message = f"{s.name} is now live on Roamie."
    else:
        target = db.query(Destination).filter(
            Destination.id == s.target_destination_id).first()
        if target:
            for field in ("description", "region", "activities"):
                value = getattr(s, field, None)
                if value:
                    setattr(target, field, value)
            if s.why_popular:
                target.other_info = s.why_popular
        message = "Your update was applied."

    notification_service.notify(
        db, s.submitted_by, "SUGGESTION_REVIEWED",
        "Your destination suggestion was approved", message)
    db.commit()
    return {"status": s.status}


# ---------- destinations ----------

@router.patch("/destinations/{destination_id}/flags")
def set_flags(destination_id: UUID,
              is_featured: bool | None = None,
              is_trending: bool | None = None,
              db: Session = Depends(get_db)):
    d = db.query(Destination).filter(Destination.id == destination_id).first()
    if not d:
        raise HTTPException(404, "Destination not found")
    if is_featured is not None:
        d.is_featured = is_featured
    if is_trending is not None:
        d.is_trending = is_trending
    db.commit()
    return {"is_featured": d.is_featured, "is_trending": d.is_trending}


# ---------- packages ----------

@router.patch("/packages/{package_id}/status")
def set_package_status(package_id: UUID, status: str,
                       db: Session = Depends(get_db)):
    p = db.query(Package).filter(Package.id == package_id).first()
    if not p:
        raise HTTPException(404, "Package not found")
    if status not in (ContentStatus.ACTIVE, ContentStatus.INACTIVE, ContentStatus.REMOVED):
        raise HTTPException(400, "Invalid status")
    p.status = status
    db.commit()
    return {"status": p.status}


# ---------- bookings ----------

@router.get("/bookings")
def all_bookings(status: str | None = None, limit: int = Query(100, le=500),
                 db: Session = Depends(get_db)):
    q = db.query(Booking)
    if status:
        q = q.filter(Booking.status == status.upper())
    rows = q.order_by(Booking.created_at.desc()).limit(limit).all()

    out = []
    for b in rows:
        traveler = db.query(User).filter(User.id == b.traveler_id).first()
        out.append({
            "id": str(b.id), "reference": b.reference,
            "traveler": traveler.full_name if traveler else None,
            "booking_type": b.booking_type, "status": b.status,
            "payment_status": b.payment_status,
            "start_date": b.start_date, "num_travelers": b.num_travelers,
            "total_amount": float(b.total_amount or 0), "currency": b.currency,
        })
    return out


# ---------- payments ----------

@router.get("/payments")
def all_payments(status: str | None = None, limit: int = Query(100, le=500),
                 db: Session = Depends(get_db)):
    q = db.query(Payment)
    if status:
        q = q.filter(Payment.status == status.upper())
    rows = q.order_by(Payment.created_at.desc()).limit(limit).all()
    return [{
        "id": str(p.id), "booking_id": str(p.booking_id),
        "amount": float(p.amount), "currency": p.currency,
        "status": p.status, "provider": p.provider,
        "transaction_id": p.transaction_id,
        "commission": float(p.platform_commission or 0),
        "paid_at": p.paid_at,
    } for p in rows]


# ---------- reports ----------

@router.get("/reports", response_model=list[ReportOut])
def list_reports(status: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Report)
    if status:
        q = q.filter(Report.status == status.upper())
    return q.order_by(Report.created_at.desc()).limit(100).all()


@router.patch("/reports/{report_id}", response_model=ReportOut)
def resolve_report(report_id: UUID, data: ReportAction,
                   admin: User = Depends(require_role(Role.ADMIN)),
                   db: Session = Depends(get_db)):
    r = db.query(Report).filter(Report.id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    r.status = data.status.upper()
    r.admin_note = data.admin_note
    r.resolved_by = admin.id
    r.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(r)
    return r

@router.patch("/reviews/{review_id}/status")
def set_review_status(review_id: UUID, status: str,
                      db: Session = Depends(get_db)):
    from app.models.social import Review
    from app.services import review_service

    r = db.query(Review).filter(Review.id == review_id).first()
    if not r:
        raise HTTPException(404, "Review not found")
    if status not in (ContentStatus.ACTIVE, ContentStatus.REMOVED):
        raise HTTPException(400, "Invalid status")
    r.status = status
    db.flush()
    review_service.recalculate(db, r.subject_type, r.subject_id)
    db.commit()
    return {"status": r.status}

@router.post("/destinations", status_code=201)
def create_destination(data: DestinationCreate,
                       admin: User = Depends(require_role(Role.ADMIN)),
                       db: Session = Depends(get_db)):
    payload = data.model_dump(exclude={"photos", "slug"})
    slug = data.slug or _slugify(data.name)

    if db.query(Destination).filter(Destination.slug == slug).first():
        raise HTTPException(409, f"A destination with the slug “{slug}” already exists")

    dest = Destination(**payload, slug=slug,
                       status=ContentStatus.ACTIVE, created_by=admin.id)
    db.add(dest)
    db.flush()

    for i, url in enumerate(data.photos):
        db.add(DestinationPhoto(destination_id=dest.id, url=url, sort_order=i))

    db.commit()
    db.refresh(dest)
    return {"id": str(dest.id), "slug": dest.slug, "name": dest.name}


@router.patch("/destinations/{destination_id}")
def update_destination(destination_id: UUID, data: DestinationUpdate,
                       db: Session = Depends(get_db)):
    d = db.query(Destination).filter(Destination.id == destination_id).first()
    if not d:
        raise HTTPException(404, "Destination not found")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(d, k, v)

    db.commit()
    db.refresh(d)
    return {"id": str(d.id), "slug": d.slug, "name": d.name}


@router.delete("/destinations/{destination_id}", status_code=204)
def delete_destination(destination_id: UUID, db: Session = Depends(get_db)):
    """Soft delete — bookings and packages reference destinations."""
    d = db.query(Destination).filter(Destination.id == destination_id).first()
    if not d:
        raise HTTPException(404, "Destination not found")

    from app.models.package import Package
    live = (db.query(Package)
            .filter(Package.destination_id == d.id,
                    Package.status == ContentStatus.ACTIVE).count())
    if live:
        raise HTTPException(
            400,
            f"{live} active package{'s' if live > 1 else ''} use this destination. "
            f"Deactivate those first.",
        )

    d.status = ContentStatus.REMOVED
    db.commit()


@router.post("/destinations/{destination_id}/photos", status_code=201)
def add_destination_photo(destination_id: UUID, url: str,
                          caption: str | None = None,
                          db: Session = Depends(get_db)):
    d = db.query(Destination).filter(Destination.id == destination_id).first()
    if not d:
        raise HTTPException(404, "Destination not found")

    count = db.query(DestinationPhoto).filter(
        DestinationPhoto.destination_id == d.id).count()
    photo = DestinationPhoto(destination_id=d.id, url=url,
                             caption=caption, sort_order=count)
    db.add(photo)
    db.commit()
    return {"id": str(photo.id), "url": photo.url}


@router.delete("/destinations/photos/{photo_id}", status_code=204)
def delete_destination_photo(photo_id: UUID, db: Session = Depends(get_db)):
    p = db.query(DestinationPhoto).filter(DestinationPhoto.id == photo_id).first()
    if not p:
        raise HTTPException(404, "Photo not found")
    db.delete(p)
    db.commit()


@router.get("/destinations")
def admin_destinations(include_removed: bool = False,
                       db: Session = Depends(get_db)):
    """Admin view — includes inactive and removed."""
    q = db.query(Destination).options(joinedload(Destination.photos),
                                      joinedload(Destination.category))
    if not include_removed:
        q = q.filter(Destination.status != ContentStatus.REMOVED)

    rows = q.order_by(Destination.name).all()

    from app.models.package import Package
    out = []
    for d in rows:
        pkg_count = db.query(Package).filter(Package.destination_id == d.id).count()
        out.append({
            "id": str(d.id), "name": d.name, "slug": d.slug,
            "region": d.region, "country": d.country,
            "description": d.description,
            "category_id": str(d.category_id) if d.category_id else None,
            "category_name": d.category.name if d.category else None,
            "lat": float(d.lat) if d.lat else None,
            "lng": float(d.lng) if d.lng else None,
            "best_time_to_visit": d.best_time_to_visit,
            "est_cost_min": float(d.est_cost_min) if d.est_cost_min else None,
            "est_cost_max": float(d.est_cost_max) if d.est_cost_max else None,
            "activities": d.activities,
            "recommended_clothing": d.recommended_clothing,
            "necessary_items": d.necessary_items,
            "popular_attractions": d.popular_attractions,
            "travel_warnings": d.travel_warnings,
            "other_info": d.other_info,
            "is_featured": d.is_featured, "is_trending": d.is_trending,
            "status": d.status,
            "search_count": d.search_count or 0,
            "package_count": pkg_count,
            "photos": [{"id": str(p.id), "url": p.url} for p in d.photos],
        })
    return out