from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_role
from app.core.enums import BookingStatus, Role
from app.db.session import get_db
from app.models.ai import TripPlan
from app.models.booking import Booking, BookingItem
from app.models.user import User
from app.schemas.ai import (AskRequest, AskResponse, DriftResponse, PlanRequest,
                            TripPlanOut)
from app.services import adaptive_service, assistant_service, planner_service

router = APIRouter(prefix="/ai", tags=["ai"])

OPEN_STATUSES = (BookingStatus.CONFIRMED, BookingStatus.ACTIVE, BookingStatus.COMPLETED)


@router.post("/plan", response_model=TripPlanOut, status_code=201)
def create_plan(req: PlanRequest,
                user: User = Depends(require_role(Role.TRAVELER)),
                db: Session = Depends(get_db)):
    return planner_service.generate_plan(db, user, req)


@router.get("/plans", response_model=list[TripPlanOut])
def my_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (db.query(TripPlan).options(joinedload(TripPlan.items))
            .filter(TripPlan.traveler_id == user.id)
            .order_by(TripPlan.created_at.desc()).all())


@router.get("/bookings/{booking_id}/plan", response_model=TripPlanOut | None)
def plan_for_booking(booking_id: UUID,
                     user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """The itinerary attached to a booking, visible to everyone on that booking."""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking or not booking.trip_plan_id:
        return None

    allowed = (booking.traveler_id == user.id
               or user.role == Role.ADMIN
               or any(i.provider_id == user.id for i in booking.items))
    if not allowed:
        raise HTTPException(403, "Not your booking")

    return (db.query(TripPlan).options(joinedload(TripPlan.items))
            .filter(TripPlan.id == booking.trip_plan_id).first())


@router.get("/plans/{plan_id}", response_model=TripPlanOut)
def plan_detail(plan_id: UUID,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    plan = (db.query(TripPlan).options(joinedload(TripPlan.items))
            .filter(TripPlan.id == plan_id).first())
    if not plan:
        raise HTTPException(404, "Trip plan not found")

    if plan.traveler_id == user.id or user.role == Role.ADMIN:
        return plan

    # a provider may read it if they're on a live booking that references it
    linked = (db.query(Booking).join(BookingItem)
              .filter(Booking.trip_plan_id == plan.id,
                      BookingItem.provider_id == user.id,
                      Booking.status.in_(OPEN_STATUSES))
              .first())
    if linked:
        return plan

    raise HTTPException(403, "You don't have access to this trip plan")


@router.patch("/plans/{plan_id}/save", response_model=TripPlanOut)
def save_plan(plan_id: UUID,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    plan = db.query(TripPlan).filter(TripPlan.id == plan_id).first()
    if not plan or plan.traveler_id != user.id:
        raise HTTPException(404, "Trip plan not found")
    plan.status = "SAVED"
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/plans/{plan_id}/drift", response_model=DriftResponse)
def check_drift(plan_id: UUID,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    plan = db.query(TripPlan).filter(TripPlan.id == plan_id).first()
    if not plan or plan.traveler_id != user.id:
        raise HTTPException(404, "Trip plan not found")

    issues = adaptive_service.check_drift(db, plan)
    return DriftResponse(has_drift=bool(issues), issues=issues)


@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db)):
    answer = assistant_service.ask(db, user, req.question, req.trip_plan_id)
    return AskResponse(answer=answer)