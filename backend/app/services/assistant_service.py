import json

from sqlalchemy.orm import Session

from app.models.ai import AIMessage, ItineraryItem, TripPlan
from app.models.booking import Booking
from app.models.destination import Destination
from app.services import gemini_service, weather_service

SYSTEM = """You are Roamie's travel assistant for Sri Lanka.
Answer using the traveller's own trip context when it is provided.
Be concise and practical. Costs in LKR.
If you do not know something, say so rather than inventing details.
You advise only — you never book or change anything."""


def build_context(db: Session, user, trip_plan_id=None) -> str:
    parts = []

    if trip_plan_id:
        plan = (db.query(TripPlan)
                .filter(TripPlan.id == trip_plan_id,
                        TripPlan.traveler_id == user.id).first())
        if plan:
            items = (db.query(ItineraryItem)
                     .filter(ItineraryItem.trip_plan_id == plan.id)
                     .order_by(ItineraryItem.day_number,
                               ItineraryItem.sort_order).all())
            parts.append(f"Trip plan: {plan.title} ({plan.start_date} to {plan.end_date})")
            parts.append("Itinerary:")
            for i in items:
                parts.append(f"  Day {i.day_number} {i.start_time or ''} — "
                             f"{i.title} ({i.location_name or ''}), LKR {i.est_cost}")

            if plan.destination_id:
                d = db.query(Destination).filter(
                    Destination.id == plan.destination_id).first()
                if d and d.lat:
                    w = weather_service.get_forecast(db, d.lat, d.lng, 5)
                    if w:
                        parts.append(f"Weather forecast: {json.dumps(w)}")

    bookings = (db.query(Booking)
                .filter(Booking.traveler_id == user.id,
                        Booking.status.in_(["PENDING", "CONFIRMED", "ACTIVE"]))
                .order_by(Booking.start_date).limit(5).all())
    if bookings:
        parts.append("Upcoming bookings:")
        for b in bookings:
            parts.append(f"  {b.reference}: {b.booking_type} on {b.start_date}, "
                         f"{b.num_travelers} people, {b.currency} {b.total_amount}, "
                         f"status {b.status}")

    return "\n".join(parts) if parts else "No trip context available."


def ask(db: Session, user, question: str, trip_plan_id=None) -> str:
    context = build_context(db, user, trip_plan_id)

    history = (db.query(AIMessage)
               .filter(AIMessage.user_id == user.id)
               .order_by(AIMessage.created_at.desc()).limit(6).all())
    history_text = "\n".join(
        f"{m.role}: {m.content}" for m in reversed(history)
    )

    prompt = f"""Traveller context:
{context}

Recent conversation:
{history_text or 'none'}

Question: {question}"""

    answer = gemini_service.generate_text(prompt, SYSTEM)

    db.add(AIMessage(user_id=user.id, role="user", content=question,
                     context_type="TRIP_PLAN", context_id=trip_plan_id))
    db.add(AIMessage(user_id=user.id, role="assistant", content=answer,
                     context_type="TRIP_PLAN", context_id=trip_plan_id))
    db.commit()

    return answer