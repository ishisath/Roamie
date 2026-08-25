from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import Role, VerificationStatus
from app.db.session import get_db
from app.models.user import DriverProfile, User, Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleOut

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


def _driver_profile(db: Session, user: User) -> DriverProfile:
    if user.role != Role.DRIVER:
        raise HTTPException(403, "Driver account required")
    profile = db.query(DriverProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(404, "Driver profile not found")
    return profile


@router.get("/mine", response_model=list[VehicleOut])
def my_vehicles(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _driver_profile(db, user)
    return (db.query(Vehicle).filter(Vehicle.driver_id == profile.id)
            .order_by(Vehicle.created_at.desc()).all())


@router.get("/driver/{driver_user_id}", response_model=list[VehicleOut])
def driver_vehicles(driver_user_id: UUID, db: Session = Depends(get_db)):
    """Public — travellers see a driver's fleet before booking."""
    profile = db.query(DriverProfile).filter_by(user_id=driver_user_id).first()
    if not profile:
        return []
    return (db.query(Vehicle)
            .filter(Vehicle.driver_id == profile.id,
                    Vehicle.is_active.is_(True)).all())


@router.post("", response_model=VehicleOut, status_code=201)
def add_vehicle(data: VehicleCreate,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    profile = _driver_profile(db, user)

    if db.query(Vehicle).filter(Vehicle.reg_no == data.reg_no).first():
        raise HTTPException(409, "A vehicle with this registration already exists")

    v = Vehicle(driver_id=profile.id,
                verification_status=VerificationStatus.PENDING,
                **data.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.patch("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: UUID, data: VehicleCreate,
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    profile = _driver_profile(db, user)
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v or v.driver_id != profile.id:
        raise HTTPException(404, "Vehicle not found")

    for k, val in data.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    db.commit()
    db.refresh(v)
    return v


@router.delete("/{vehicle_id}", status_code=204)
def deactivate_vehicle(vehicle_id: UUID,
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    profile = _driver_profile(db, user)
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v or v.driver_id != profile.id:
        raise HTTPException(404, "Vehicle not found")
    v.is_active = False
    db.commit()