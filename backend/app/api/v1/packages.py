from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_verified_provider
from app.core.enums import ContentStatus
from app.db.session import get_db
from app.models.destination import Destination
from app.models.package import Package
from app.models.user import GuideProfile, User
from app.schemas.destination import Paginated
from app.schemas.package import PackageCard, PackageCreate, PackageDetail

router = APIRouter(prefix="/packages", tags=["packages"])


@router.get("/popular", response_model=list[PackageCard])
def popular(limit: int = 6, db: Session = Depends(get_db)):
    return (db.query(Package)
            .options(joinedload(Package.photos))
            .filter(Package.status == ContentStatus.ACTIVE)
            .order_by(Package.rating_avg.desc(), Package.booking_count.desc())
            .limit(limit).all())


@router.get("", response_model=Paginated)
def search_packages(
    q: str | None = None,
    destination: str | None = Query(None, description="Destination slug"),
    package_type: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    duration: int | None = None,
    min_rating: float | None = None,
    transport_included: bool | None = None,
    guide_id: str | None = None,
    sort: str = Query("popular", pattern="^(popular|price_low|price_high|rating|duration)$"),
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = (db.query(Package)
             .options(joinedload(Package.photos))
             .filter(Package.status == ContentStatus.ACTIVE))

    if q:
        query = query.filter(Package.title.ilike(f"%{q}%"))
    if destination:
        query = query.join(Destination).filter(Destination.slug == destination)
    if package_type:
        query = query.filter(Package.package_type == package_type)
    if min_price is not None:
        query = query.filter(Package.price >= min_price)
    if max_price is not None:
        query = query.filter(Package.price <= max_price)
    if duration:
        query = query.filter(Package.duration_days == duration)
    if min_rating is not None:
        query = query.filter(Package.rating_avg >= min_rating)
    if transport_included is not None:
        query = query.filter(Package.transport_included.is_(transport_included))
    if guide_id:
        query = query.filter(Package.guide_id == guide_id)

    order = {
        "popular": Package.booking_count.desc(),
        "price_low": Package.price.asc(),
        "price_high": Package.price.desc(),
        "rating": Package.rating_avg.desc(),
        "duration": Package.duration_days.asc(),
    }[sort]

    total = query.count()
    rows = query.order_by(order).offset((page - 1) * size).limit(size).all()
    return Paginated(total=total, page=page, size=size,
                     items=[PackageCard.model_validate(r) for r in rows])


@router.get("/mine", response_model=list[PackageCard])
def my_packages(user: User = Depends(get_verified_provider),
                db: Session = Depends(get_db)):
    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(403, "Guide profile required")
    return (db.query(Package)
            .options(joinedload(Package.photos))
            .filter(Package.guide_id == profile.id)
            .order_by(Package.created_at.desc()).all())


@router.get("/{package_id}", response_model=PackageDetail)
def package_detail(package_id: str, db: Session = Depends(get_db)):
    pkg = (db.query(Package)
           .options(joinedload(Package.photos), joinedload(Package.dates))
           .filter(Package.id == package_id).first())
    if not pkg:
        raise HTTPException(404, "Package not found")
    return pkg


@router.post("", response_model=PackageDetail, status_code=201)
def create_package(data: PackageCreate,
                   user: User = Depends(get_verified_provider),
                   db: Session = Depends(get_db)):
    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(403, "Guide profile required")

    if data.transport_included and not data.vehicle_type:
        raise HTTPException(400, "Vehicle details required when transport is included")

    pkg = Package(guide_id=profile.id, status=ContentStatus.ACTIVE,
                  **data.model_dump())
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.patch("/{package_id}", response_model=PackageDetail)
def update_package(package_id: str, data: PackageCreate,
                   user: User = Depends(get_verified_provider),
                   db: Session = Depends(get_db)):
    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    pkg = db.query(Package).filter_by(id=package_id).first()
    if not pkg:
        raise HTTPException(404, "Package not found")
    if pkg.guide_id != profile.id:
        raise HTTPException(403, "Not your package")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(pkg, field, value)
    db.commit()
    db.refresh(pkg)
    return pkg


@router.delete("/{package_id}", status_code=204)
def deactivate_package(package_id: str,
                       user: User = Depends(get_verified_provider),
                       db: Session = Depends(get_db)):
    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    pkg = db.query(Package).filter_by(id=package_id).first()
    if not pkg:
        raise HTTPException(404, "Package not found")
    if pkg.guide_id != profile.id:
        raise HTTPException(403, "Not your package")
    pkg.status = ContentStatus.INACTIVE
    db.commit()

from app.models.package import PackageDate, PackagePhoto
from app.schemas.package import PhotoIn
from datetime import date as date_type


@router.post("/{package_id}/photos", status_code=201)
def add_photo(package_id: str, data: PhotoIn,
              user: User = Depends(get_verified_provider),
              db: Session = Depends(get_db)):
    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    pkg = db.query(Package).filter_by(id=package_id).first()
    if not pkg or pkg.guide_id != profile.id:
        raise HTTPException(404, "Package not found")
    photo = PackagePhoto(package_id=pkg.id, url=data.url, sort_order=data.sort_order)
    db.add(photo)
    db.commit()
    return {"id": str(photo.id), "url": photo.url}


@router.post("/{package_id}/dates", status_code=201)
def add_date(package_id: str, start_date: date_type, end_date: date_type,
             slots: int = 10,
             user: User = Depends(get_verified_provider),
             db: Session = Depends(get_db)):
    profile = db.query(GuideProfile).filter_by(user_id=user.id).first()
    pkg = db.query(Package).filter_by(id=package_id).first()
    if not pkg or pkg.guide_id != profile.id:
        raise HTTPException(404, "Package not found")
    d = PackageDate(package_id=pkg.id, start_date=start_date,
                    end_date=end_date, slots_total=slots)
    db.add(d)
    db.commit()
    return {"id": str(d.id)}