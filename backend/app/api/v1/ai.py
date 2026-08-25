from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user, require_role
from app.core.enums import Role
from app.db.session import get_db
from app.models.ai import ItineraryItem, TripPlan
from app.models.user import User
from app.schemas.ai import (AskRequest, AskResponse, DriftResponse, PlanRequest,
                            TripPlanOut)
from app.services import adaptive_service, assistant_service, planner_service

router = APIRouter(prefix="/ai", tags=["ai"])


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


@router.get("/plans/{plan_id}", response_model=TripPlanOut)
def plan_detail(plan_id: UUID,
                user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    plan = (db.query(TripPlan).options(joinedload(TripPlan.items))
            .filter(TripPlan.id == plan_id).first())
    if not plan:
        raise HTTPException(404, "Trip plan not found")
    if plan.traveler_id != user.id:
        raise HTTPException(403, "Not your trip plan")
    return plan


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