from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.core.enums import BookingStatus, ContentStatus, Role, ServiceType
from app.db.session import get_db
from app.models.booking import Booking, BookingItem
from app.models.package import Package
from app.models.social import Review
from app.models.user import User
from app.schemas.review import ReviewableItem, ReviewCreate, ReviewOut
from app.services import notification_service, review_service

router = APIRouter(prefix="/reviews", tags=["reviews"])

VALID_SUBJECTS = (ServiceType.GUIDE, ServiceType.DRIVER, ServiceType.PACKAGE)


@router.get("/pending", response_model=list[ReviewableItem])
def pending_reviews(user: User = Depends(require_role(Role.TRAVELER)),
                    db: Session = Depends(get_db)):
    """Completed bookings the traveller hasn't reviewed yet."""
    bookings = (db.query(Booking)
                .filter(Booking.traveler_id == user.id,
                        Booking.status == BookingStatus.COMPLETED).all())

    done = {(r.booking_id, r.subject_type, r.subject_id)
            for r in db.query(Review).filter(Review.reviewer_id == user.id).all()}

    out = []
    for b in bookings:
        for item in b.items:
            if item.service_type == ServiceType.PACKAGE and item.package_id:
                pkg = db.query(Package).filter(Package.id == item.package_id).first()
                key = (b.id, ServiceType.PACKAGE, item.package_id)
                if pkg and key not in done:
                    out.append(ReviewableItem(
                        booking_id=b.id, reference=b.reference,
                        subject_type=ServiceType.PACKAGE, subject_id=pkg.id,
                        subject_name=pkg.title,
                        start_date=b.start_date.isoformat() if b.start_date else None,
                    ))
            if item.provider_id:
                subject_type = (ServiceType.GUIDE
                                if item.service_type in (ServiceType.GUIDE, ServiceType.PACKAGE)
                                else ServiceType.DRIVER)
                key = (b.id, subject_type, item.provider_id)
                if key in done:
                    continue
                provider = db.query(User).filter(User.id == item.provider_id).first()
                if provider:
                    out.append(ReviewableItem(
                        booking_id=b.id, reference=b.reference,
                        subject_type=subject_type, subject_id=provider.id,
                        subject_name=provider.full_name,
                        start_date=b.start_date.isoformat() if b.start_date else None,
                    ))
    return out


@router.post("", response_model=ReviewOut, status_code=201)
def create_review(data: ReviewCreate,
                  user: User = Depends(require_role(Role.TRAVELER)),
                  db: Session = Depends(get_db)):
    if data.subject_type not in VALID_SUBJECTS:
        raise HTTPException(400, "Invalid subject type")

    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")
    if booking.traveler_id != user.id:
        raise HTTPException(403, "Not your booking")
    if booking.status != BookingStatus.COMPLETED:
        raise HTTPException(400, "You can review once the booking is completed")

    # the subject must actually appear on this booking
    valid = any(
        (data.subject_type == ServiceType.PACKAGE and i.package_id == data.subject_id)
        or (data.subject_type in (ServiceType.GUIDE, ServiceType.DRIVER)
            and i.provider_id == data.subject_id)
        for i in booking.items
    )
    if not valid:
        raise HTTPException(400, "That service isn't part of this booking")

    existing = (db.query(Review)
                .filter(Review.booking_id == data.booking_id,
                        Review.reviewer_id == user.id,
                        Review.subject_type == data.subject_type,
                        Review.subject_id == data.subject_id).first())
    if existing:
        raise HTTPException(409, "You've already reviewed this")

    review = Review(reviewer_id=user.id, status=ContentStatus.ACTIVE,
                    **data.model_dump())
    db.add(review)
    db.flush()

    review_service.recalculate(db, data.subject_type, data.subject_id)

    if data.subject_type in (ServiceType.GUIDE, ServiceType.DRIVER):
        notification_service.notify(
            db, data.subject_id, "NEW_REVIEW", "You received a review",
            f"{user.full_name} rated you {data.rating}/5.",
        )

    db.commit()
    db.refresh(review)
    return ReviewOut(**{k: getattr(review, k) for k in
                        ("id", "booking_id", "reviewer_id", "subject_type",
                         "subject_id", "rating", "comment", "criteria",
                         "status", "created_at")},
                     reviewer_name=user.full_name)


@router.get("/subject/{subject_type}/{subject_id}", response_model=list[ReviewOut])
def subject_reviews(subject_type: str, subject_id: UUID,
                    db: Session = Depends(get_db)):
    """Public — reviews for a guide, driver or package."""
    rows = (db.query(Review)
            .filter(Review.subject_type == subject_type.upper(),
                    Review.subject_id == subject_id,
                    Review.status == ContentStatus.ACTIVE)
            .order_by(Review.created_at.desc()).limit(50).all())

    out = []
    for r in rows:
        reviewer = db.query(User).filter(User.id == r.reviewer_id).first()
        out.append(ReviewOut(**{k: getattr(r, k) for k in
                                ("id", "booking_id", "reviewer_id", "subject_type",
                                 "subject_id", "rating", "comment", "criteria",
                                 "status", "created_at")},
                             reviewer_name=reviewer.full_name if reviewer else None))
    return out


@router.get("/mine", response_model=list[ReviewOut])
def my_reviews(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (db.query(Review).filter(Review.reviewer_id == user.id)
            .order_by(Review.created_at.desc()).all())
    return [ReviewOut(**{k: getattr(r, k) for k in
                         ("id", "booking_id", "reviewer_id", "subject_type",
                          "subject_id", "rating", "comment", "criteria",
                          "status", "created_at")},
                      reviewer_name=user.full_name) for r in rows]