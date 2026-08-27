from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.enums import Role
from app.db.session import get_db
from app.models.payment import Expense, TripBudget
from app.models.user import User
from app.schemas.budget import (BudgetCreate, BudgetOut, BudgetSummary,
                                BudgetUpdate, ExpenseCreate, ExpenseOut)
from app.services import budget_service

router = APIRouter(prefix="/budget", tags=["budget"],
                   dependencies=[Depends(require_role(Role.TRAVELER))])


def _own(db: Session, budget_id, user) -> TripBudget:
    b = db.query(TripBudget).filter(TripBudget.id == budget_id).first()
    if not b:
        raise HTTPException(404, "Budget not found")
    if b.traveler_id != user.id:
        raise HTTPException(403, "Not your budget")
    return b


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(data: BudgetCreate,
                  user: User = Depends(require_role(Role.TRAVELER)),
                  db: Session = Depends(get_db)):
    b = TripBudget(traveler_id=user.id, **data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.get("", response_model=list[BudgetOut])
def list_budgets(user: User = Depends(require_role(Role.TRAVELER)),
                 db: Session = Depends(get_db)):
    return (db.query(TripBudget)
            .filter(TripBudget.traveler_id == user.id)
            .order_by(TripBudget.created_at.desc()).all())


@router.get("/{budget_id}", response_model=BudgetSummary)
def budget_summary(budget_id: UUID,
                   user: User = Depends(require_role(Role.TRAVELER)),
                   db: Session = Depends(get_db)):
    b = _own(db, budget_id, user)

    reference = None
    if b.booking_id:
        from app.models.booking import Booking
        bk = db.query(Booking).filter(Booking.id == b.booking_id).first()
        reference = bk.reference if bk else None

    return {**BudgetOut.model_validate(b).model_dump(),
            "booking_reference": reference,
            **budget_service.summarise(db, b)}


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: UUID, data: BudgetUpdate,
                  user: User = Depends(require_role(Role.TRAVELER)),
                  db: Session = Depends(get_db)):
    b = _own(db, budget_id, user)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return b


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: UUID,
                  user: User = Depends(require_role(Role.TRAVELER)),
                  db: Session = Depends(get_db)):
    b = _own(db, budget_id, user)

    linked = (db.query(Expense)
              .filter(Expense.budget_id == b.id,
                      Expense.booking_id.isnot(None)).count())
    if linked:
        raise HTTPException(
            400,
            f"This budget has {linked} expense{'s' if linked > 1 else ''} from Roamie "
            f"bookings. Cancel those bookings first, or keep the budget for your records.",
        )

    db.query(Expense).filter(Expense.budget_id == b.id).delete()
    db.delete(b)
    db.commit()


@router.post("/{budget_id}/expenses", response_model=ExpenseOut, status_code=201)
def add_expense(budget_id: UUID, data: ExpenseCreate,
                user: User = Depends(require_role(Role.TRAVELER)),
                db: Session = Depends(get_db)):
    b = _own(db, budget_id, user)
    before = budget_service.summarise(db, b)["percent_used"]

    e = Expense(budget_id=b.id, traveler_id=user.id, **data.model_dump())
    db.add(e)
    db.commit()

    after = budget_service.summarise(db, b)["percent_used"]
    budget_service.check_thresholds(db, b, before, after)
    db.commit()
    db.refresh(e)
    return e


@router.patch("/expenses/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: UUID, data: ExpenseCreate,
                   user: User = Depends(require_role(Role.TRAVELER)),
                   db: Session = Depends(get_db)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e or e.traveler_id != user.id:
        raise HTTPException(404, "Expense not found")
    if e.booking_id:
        raise HTTPException(400, "Expenses from Roamie bookings can't be edited")

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(expense_id: UUID,
                   user: User = Depends(require_role(Role.TRAVELER)),
                   db: Session = Depends(get_db)):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e or e.traveler_id != user.id:
        raise HTTPException(404, "Expense not found")
    if e.booking_id:
        raise HTTPException(
            400,
            "This came from a Roamie booking. Cancel or refund the booking to remove it.",
        )
    db.delete(e)
    db.commit()