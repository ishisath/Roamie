import json
from datetime import timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.ai import ItineraryItem, TripPlan
from app.models.destination import Destination
from app.services import gemini_service, weather_service

SYSTEM = """You are a Sri Lanka travel planning assistant for the Roamie platform.
You produce practical, realistic day-by-day itineraries.
Costs are in Sri Lankan Rupees (LKR) and should reflect real local prices.
You recommend only. The traveller decides what to book."""


def _schema_hint() -> str:
    return """Return JSON in exactly this shape:
{
  "title": "short trip title",
  "summary": "2-3 sentence overview",
  "total_est_cost": 45000,
  "days": [
    {
      "day_number": 1,
      "items": [
        {
          "start_time": "08:00",
          "title": "Climb Sigiriya Rock",
          "description": "one or two sentences",
          "activity_type": "sightseeing",
          "location_name": "Sigiriya",
          "lat": 7.957,
          "lng": 80.7603,
          "est_cost": 8000
        }
      ]
    }
  ],
  "packing": ["item", "item"],
  "warnings": ["warning"]
}"""


def generate_plan(db: Session, traveler, req) -> TripPlan:
    destination = None
    if req.destination_id:
        destination = db.query(Destination).filter(
            Destination.id == req.destination_id).first()

    dest_name = destination.name if destination else (req.destination_name or "Sri Lanka")

    weather = []
    if destination and destination.lat:
        weather = weather_service.get_forecast(db, destination.lat, destination.lng, 5)

    context = ""
    if destination:
        context = f"""
Destination facts from our database:
- Name: {destination.name}, {destination.region}
- Description: {destination.description}
- Activities: {', '.join(destination.activities or [])}
- Best time to visit: {destination.best_time_to_visit}
- Typical cost range: LKR {destination.est_cost_min}–{destination.est_cost_max}
- Known warnings: {destination.travel_warnings}"""

    if weather:
        context += f"\n\nWeather forecast: {json.dumps(weather)}"

    prompt = f"""Plan a {req.days}-day trip to {dest_name} in Sri Lanka.

Travellers: {req.num_people}
Start date: {req.start_date}
Budget: {f'LKR {req.budget} total' if req.budget else 'flexible'}
Interests: {', '.join(req.interests) if req.interests else 'general sightseeing'}
Preferences: {req.preferences or 'none stated'}
{context}

Give 3-5 items per day with realistic timings and travel time between places.
Adjust plans for the weather forecast where relevant.
{_schema_hint()}"""

    data = gemini_service.generate_json(prompt, SYSTEM)

    plan = TripPlan(
        traveler_id=traveler.id,
        destination_id=destination.id if destination else None,
        title=data.get("title", f"{req.days} days in {dest_name}"),
        summary=data.get("summary"),
        inputs={
            **req.model_dump(mode="json"),
            "packing": data.get("packing", []),
            "warnings": data.get("warnings", []),
        },
        total_est_cost=Decimal(str(data.get("total_est_cost", 0))),
        start_date=req.start_date,
        end_date=req.start_date + timedelta(days=req.days - 1),
        status="DRAFT",
        version=1,
    )
    db.add(plan)
    db.flush()

    weather_by_day = {i: w for i, w in enumerate(weather, start=1)}

    for day in data.get("days", []):
        n = day.get("day_number", 1)
        for order, item in enumerate(day.get("items", [])):
            db.add(ItineraryItem(
                trip_plan_id=plan.id,
                day_number=n,
                start_time=item.get("start_time"),
                title=item.get("title", "Activity")[:200],
                description=item.get("description"),
                activity_type=item.get("activity_type"),
                location_name=item.get("location_name"),
                lat=Decimal(str(item["lat"])) if item.get("lat") else None,
                lng=Decimal(str(item["lng"])) if item.get("lng") else None,
                est_cost=Decimal(str(item.get("est_cost", 0))),
                weather_assumption=weather_by_day.get(n, {}),
                sort_order=order,
            ))

    db.commit()
    db.refresh(plan)
    return plan