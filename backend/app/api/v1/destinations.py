from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.enums import ContentStatus
from app.db.session import get_db
from app.models.destination import Destination, DestinationCategory
from app.schemas.destination import (CategoryOut, DestinationCard,
                                     DestinationDetail, Paginated)

router = APIRouter(prefix="/destinations", tags=["destinations"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(DestinationCategory).order_by(DestinationCategory.name).all()


@router.get("/featured", response_model=list[DestinationCard])
def featured(limit: int = 6, db: Session = Depends(get_db)):
    return (db.query(Destination)
            .options(joinedload(Destination.photos), joinedload(Destination.category))
            .filter(Destination.is_featured.is_(True),
                    Destination.status == ContentStatus.ACTIVE)
            .limit(limit).all())


@router.get("/trending", response_model=list[DestinationCard])
def trending(limit: int = 6, db: Session = Depends(get_db)):
    return (db.query(Destination)
            .options(joinedload(Destination.photos), joinedload(Destination.category))
            .filter(Destination.is_trending.is_(True),
                    Destination.status == ContentStatus.ACTIVE)
            .order_by(Destination.search_count.desc())
            .limit(limit).all())


@router.get("", response_model=Paginated)
def search_destinations(
    q: str | None = Query(None, description="Free text on name/description/region"),
    category: str | None = Query(None, description="Category slug"),
    region: str | None = None,
    activity: str | None = None,
    min_rating: float | None = None,
    sort: str = Query("popular", pattern="^(popular|rating|name|cost_low|cost_high)$"),
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = (db.query(Destination)
             .options(joinedload(Destination.photos), joinedload(Destination.category))
             .filter(Destination.status == ContentStatus.ACTIVE))

    if q:
        pattern = f"%{q}%"
        query = query.filter(or_(
            Destination.name.ilike(pattern),
            Destination.description.ilike(pattern),
            Destination.region.ilike(pattern),
        ))
    if category:
        query = query.join(DestinationCategory).filter(DestinationCategory.slug == category)
    if region:
        query = query.filter(Destination.region.ilike(f"%{region}%"))
    if activity:
        query = query.filter(Destination.activities.any(activity))
    if min_rating is not None:
        query = query.filter(Destination.rating_avg >= min_rating)

    order = {
        "popular": Destination.search_count.desc(),
        "rating": Destination.rating_avg.desc(),
        "name": Destination.name.asc(),
        "cost_low": Destination.est_cost_min.asc(),
        "cost_high": Destination.est_cost_max.desc(),
    }[sort]

    total = query.count()
    rows = query.order_by(order).offset((page - 1) * size).limit(size).all()

    return Paginated(
        total=total, page=page, size=size,
        items=[DestinationCard.model_validate(r) for r in rows],
    )


@router.get("/{slug}", response_model=DestinationDetail)
def destination_detail(slug: str, db: Session = Depends(get_db)):
    dest = (db.query(Destination)
            .options(joinedload(Destination.photos), joinedload(Destination.category))
            .filter(Destination.slug == slug,
                    Destination.status == ContentStatus.ACTIVE)
            .first())
    if not dest:
        raise HTTPException(404, "Destination not found")

    dest.search_count = (dest.search_count or 0) + 1
    db.commit()
    db.refresh(dest)
    return dest