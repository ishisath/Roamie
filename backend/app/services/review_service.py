from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.enums import ContentStatus, ServiceType
from app.models.package import Package
from app.models.social import Review
from app.models.user import DriverProfile, GuideProfile


def recalculate(db: Session, subject_type: str, subject_id) -> None:
    """Recompute the average rating for whatever was reviewed."""
    result = (db.query(func.avg(Review.rating), func.count(Review.id))
              .filter(Review.subject_type == subject_type,
                      Review.subject_id == subject_id,
                      Review.status == ContentStatus.ACTIVE)
              .first())
    avg, count = result[0] or 0, result[1] or 0

    if subject_type == ServiceType.PACKAGE:
        target = db.query(Package).filter(Package.id == subject_id).first()
    elif subject_type == ServiceType.GUIDE:
        target = db.query(GuideProfile).filter(
            GuideProfile.user_id == subject_id).first()
    else:
        target = db.query(DriverProfile).filter(
            DriverProfile.user_id == subject_id).first()

    if target:
        target.rating_avg = Decimal(str(round(float(avg), 2)))
        target.rating_count = count