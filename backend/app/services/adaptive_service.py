from datetime import date

from sqlalchemy.orm import Session

from app.models.ai import ItineraryItem, PlanRevision, TripPlan
from app.models.destination import Destination
from app.services import weather_service

OUTDOOR = {"hiking", "safari", "beach", "sightseeing", "outdoor", "water"}


def check_drift(db: Session, plan: TripPlan) -> list[dict]:
    """Compare stored weather assumptions against a fresh forecast."""
    if not plan.destination_id:
        return []

    d = db.query(Destination).filter(Destination.id == plan.destination_id).first()
    if not d or not d.lat:
        return []

    forecast = weather_service.get_forecast(db, d.lat, d.lng, 5)
    if not forecast:
        return []

    by_date = {f["date"]: f for f in forecast}
    items = (db.query(ItineraryItem)
             .filter(ItineraryItem.trip_plan_id == plan.id)
             .order_by(ItineraryItem.day_number).all())

    issues, seen = [], set()

    for item in items:
        if not plan.start_date:
            continue
        item_date = (plan.start_date + __import__("datetime")
                     .timedelta(days=item.day_number - 1)).isoformat()
        current = by_date.get(item_date)
        if not current or item.day_number in seen:
            continue

        assumed = item.weather_assumption or {}
        is_outdoor = (item.activity_type or "").lower() in OUTDOOR

        if current.get("will_rain") and not assumed.get("will_rain") and is_outdoor:
            issues.append({
                "day_number": item.day_number,
                "reason": "RAIN_FORECAST",
                "detail": f"Rain now forecast on day {item.day_number} "
                          f"({current['rain_mm']}mm). Outdoor activities may be affected.",
            })
            seen.add(item.day_number)

        elif assumed.get("temp_max") and \
                abs(current["temp_max"] - assumed["temp_max"]) > 5:
            issues.append({
                "day_number": item.day_number,
                "reason": "TEMP_CHANGE",
                "detail": f"Temperature on day {item.day_number} now "
                          f"{current['temp_max']}°C, was {assumed['temp_max']}°C.",
            })
            seen.add(item.day_number)

    return issues