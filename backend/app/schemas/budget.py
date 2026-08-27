from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    title: str
    total_budget: Decimal = Field(gt=0)
    currency: str = "LKR"
    start_date: date | None = None
    end_date: date | None = None
    trip_plan_id: UUID | None = None


class ExpenseCreate(BaseModel):
    category: str = "OTHER"
    amount: Decimal = Field(gt=0)
    note: str | None = None
    spent_on: date
    booking_id: UUID | None = None


class ExpenseOut(BaseModel):
    id: UUID
    category: str
    amount: Decimal
    note: str | None = None
    spent_on: date
    booking_id: UUID | None = None
    model_config = {"from_attributes": True}


class CategoryTotal(BaseModel):
    category: str
    amount: Decimal
    percent: float


class BudgetOut(BaseModel):
    id: UUID
    title: str
    total_budget: Decimal
    currency: str
    start_date: date | None = None
    end_date: date | None = None
    model_config = {"from_attributes": True}


class BudgetSummary(BudgetOut):
    total_spent: Decimal
    remaining: Decimal
    percent_used: float
    status: str                 # OK | WARNING | CRITICAL | OVER
    message: str | None = None
    daily_burn: Decimal | None = None
    projected_total: Decimal | None = None
    days_elapsed: int | None = None
    days_total: int | None = None
    by_category: list[CategoryTotal] = []
    expenses: list[ExpenseOut] = []

class ExpenseOut(BaseModel):
    id: UUID
    category: str
    amount: Decimal
    note: str | None = None
    spent_on: date
    booking_id: UUID | None = None
    model_config = {"from_attributes": True}

    @property
    def is_automatic(self) -> bool:
        return self.booking_id is not None