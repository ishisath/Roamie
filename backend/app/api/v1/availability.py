from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import AvailabilityStatus, Role
from app.db.session import get_db
from app.models.package import Availability
from app.models.user import User

router = APIRouter(prefix="/availability", tags=["availability"])


class AvailabilityOut(BaseModel):
    id: UUID
    date: date
    status: str
    note: str | None = None
    model_config = {"from_attributes": True}


class AvailabilitySet(BaseModel):
    dates: list[date]
    status: str
    note: str | None = None


@router.get("/me", response_model=list[AvailabilityOut])
def my_availability(days: int = Query(60, le=180),
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Provider account required")
    today = date.today()
    return (db.query(Availability)
            .filter(Availability.provider_id == user.id,
                    Availability.date >= today,
                    Availability.date <= today + timedelta(days=days))
            .order_by(Availability.date).all())


@router.get("/provider/{provider_id}", response_model=list[AvailabilityOut])
def provider_availability(provider_id: UUID, days: int = Query(60, le=180),
                          db: Session = Depends(get_db)):
    """Public — travellers check before booking."""
    today = date.today()
    return (db.query(Availability)
            .filter(Availability.provider_id == provider_id,
                    Availability.date >= today,
                    Availability.date <= today + timedelta(days=days))
            .order_by(Availability.date).all())


@router.put("/me", response_model=list[AvailabilityOut])
def set_availability(data: AvailabilitySet,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Provider account required")
    if data.status not in (AvailabilityStatus.AVAILABLE, AvailabilityStatus.UNAVAILABLE):
        raise HTTPException(400, "Status must be AVAILABLE or UNAVAILABLE")

    updated = []
    for d in data.dates:
        row = (db.query(Availability)
               .filter(Availability.provider_id == user.id,
                       Availability.date == d).first())
        if row:
            if row.status == AvailabilityStatus.BOOKED:
                continue          # never overwrite a booked date
            row.status = data.status
            row.note = data.note
        else:
            row = Availability(provider_id=user.id, date=d,
                               status=data.status, note=data.note)
            db.add(row)
        updated.append(row)

    db.commit()
    return updated

@router.post("/me/extend")
def extend_availability(days: int = Query(90, le=365),
                        user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Open up more dates, from today forward."""
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Provider account required")

    today = date.today()
    existing = {a.date for a in db.query(Availability)
                .filter(Availability.provider_id == user.id,
                        Availability.date >= today).all()}

    added = 0
    for i in range(days):
        d = today + timedelta(days=i)
        if d not in existing:
            db.add(Availability(provider_id=user.id, date=d,
                                status=AvailabilityStatus.AVAILABLE))
            added += 1

    db.commit()
    return {"added": added}