from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.payment import Expense, TripBudget
from app.services import notification_service

WARNING_AT = Decimal("0.50")
CRITICAL_AT = Decimal("0.80")


def summarise(db: Session, budget: TripBudget) -> dict:
    expenses = (db.query(Expense)
                .filter(Expense.budget_id == budget.id)
                .order_by(Expense.spent_on.desc()).all())

    total = Decimal(str(budget.total_budget))
    spent = sum((Decimal(str(e.amount)) for e in expenses), Decimal("0"))
    remaining = total - spent
    percent = float(spent / total * 100) if total else 0.0

    if percent >= 100:
        status = "OVER"
        message = f"You're over budget by {budget.currency} {abs(remaining):,.0f}."
    elif percent >= float(CRITICAL_AT * 100):
        status = "CRITICAL"
        message = f"Only {budget.currency} {remaining:,.0f} left — {100 - percent:.0f}% of your budget."
    elif percent >= float(WARNING_AT * 100):
        status = "WARNING"
        message = f"You've used {percent:.0f}% of your budget."
    else:
        status = "OK"
        message = None

    # burn rate projection
    daily_burn = projected = None
    days_elapsed = days_total = None
    if budget.start_date and budget.end_date:
        days_total = (budget.end_date - budget.start_date).days + 1
        days_elapsed = max(1, min(days_total, (date.today() - budget.start_date).days + 1))
        if date.today() >= budget.start_date and spent > 0:
            daily_burn = (spent / days_elapsed).quantize(Decimal("0.01"))
            projected = (daily_burn * days_total).quantize(Decimal("0.01"))
            if projected > total and status in ("OK", "WARNING"):
                status = "WARNING"
                message = (f"At {budget.currency} {daily_burn:,.0f} a day you're on track "
                           f"to spend {budget.currency} {projected:,.0f} — "
                           f"{budget.currency} {projected - total:,.0f} over.")

    by_cat: dict[str, Decimal] = {}
    for e in expenses:
        by_cat[e.category] = by_cat.get(e.category, Decimal("0")) + Decimal(str(e.amount))

    categories = [
        {"category": c, "amount": a,
         "percent": round(float(a / spent * 100), 1) if spent else 0.0}
        for c, a in sorted(by_cat.items(), key=lambda x: -x[1])
    ]

    return {
        "total_spent": spent,
        "remaining": remaining,
        "percent_used": round(percent, 1),
        "status": status,
        "message": message,
        "daily_burn": daily_burn,
        "projected_total": projected,
        "days_elapsed": days_elapsed,
        "days_total": days_total,
        "by_category": categories,
        "expenses": expenses,
    }


def check_thresholds(db: Session, budget: TripBudget, before: float, after: float) -> None:
    """Notify once per threshold crossing."""
    for level, label in ((50, "half"), (80, "80%"), (100, "all")):
        if before < level <= after:
            if level == 100:
                title = "Budget exceeded"
                body = f"You've spent your full budget for {budget.title}."
            else:
                title = f"You've used {label} your budget"
                body = f"{budget.title}: {after:.0f}% of {budget.currency} {budget.total_budget:,.0f} spent."
            notification_service.notify(
                db, budget.traveler_id, "BUDGET_ALERT", title, body, f"/budget/{budget.id}"
            )