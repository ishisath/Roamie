import json

from sqlalchemy.orm import Session

from app.models.ai import AIMessage, ItineraryItem, TripPlan
from app.models.booking import Booking
from app.models.destination import Destination
from app.models.package import Package
from app.models.user import DriverProfile, GuideProfile, User, Vehicle
from app.services import gemini_service, weather_service

SYSTEM = """You are Roamie's travel assistant for Sri Lanka.
Answer using the traveller's own context when it is provided — their package,
destination, booking or itinerary. Be concise and practical. Costs in LKR.
If you don't know something, say so rather than inventing details.
You advise only — you never book or change anything."""


def _weather_for(db: Session, dest: Destination) -> str:
    if not dest or not dest.lat:
        return ""
    w = weather_service.get_forecast(db, dest.lat, dest.lng, 5)
    return f"\n5-day forecast for {dest.name}: {json.dumps(w)}" if w else ""


def _destination_block(db: Session, dest: Destination) -> str:
    if not dest:
        return ""
    parts = [
        f"\nDestination: {dest.name}, {dest.region}",
        f"About: {dest.description}",
        f"Best time to visit: {dest.best_time_to_visit}",
        f"Typical cost: LKR {dest.est_cost_min}–{dest.est_cost_max}",
        f"Activities: {', '.join(dest.activities or [])}",
        f"What to wear: {', '.join(dest.recommended_clothing or [])}",
        f"What to bring: {', '.join(dest.necessary_items or [])}",
        f"Warnings: {dest.travel_warnings}",
    ]
    return "\n".join(p for p in parts if p and "None" not in p)


def build_context(db: Session, user, trip_plan_id=None,
                  context_type=None, context_id=None) -> str:
    parts = []

    # ---- package ----
    if context_type == "PACKAGE" and context_id:
        p = db.query(Package).filter(Package.id == context_id).first()
        if p:
            guide = db.query(GuideProfile).filter(GuideProfile.id == p.guide_id).first()
            guide_user = (db.query(User).filter(User.id == guide.user_id).first()
                          if guide else None)

            parts.append(f"""
Package the traveller is looking at:
- Title: {p.title}
- Description: {p.description}
- Duration: {p.duration_days} day(s)
- Price: {p.currency} {p.price} per person
- Maximum travellers: {p.max_travelers}
- Activities: {', '.join(p.activities or [])}
- Included: {', '.join(p.included or [])}
- Not included: {', '.join(p.excluded or [])}
- Transport included: {'yes' if p.transport_included else 'no'}""")

            if p.transport_included:
                parts.append(
                    f"- Vehicle: {p.vehicle_type}, {p.vehicle_seats} seats, "
                    f"{'AC' if p.is_ac else 'non-AC'}\n"
                    f"- Pickup: {p.pickup_info}\n- Drop-off: {p.dropoff_info}"
                )

            if guide and guide_user:
                parts.append(
                    f"- Guide: {guide_user.full_name}, {guide.years_experience} years "
                    f"experience, speaks {', '.join(guide.languages or [])}, "
                    f"rated {guide.rating_avg}/5 from {guide.rating_count} reviews"
                )

            if p.dates:
                dates = ", ".join(
                    f"{d.start_date} ({d.slots_total - d.slots_booked} left)"
                    for d in p.dates[:5]
                )
                parts.append(f"- Available dates: {dates}")

            dest = db.query(Destination).filter(
                Destination.id == p.destination_id).first()
            parts.append(_destination_block(db, dest))
            parts.append(_weather_for(db, dest))

    # ---- destination ----
    elif context_type == "DESTINATION" and context_id:
        dest = db.query(Destination).filter(Destination.id == context_id).first()
        parts.append(_destination_block(db, dest))
        parts.append(_weather_for(db, dest))

    # ---- provider ----
    elif context_type == "PROVIDER" and context_id:
        u = db.query(User).filter(User.id == context_id).first()
        if u:
            profile = (u.guide_profile if u.role == "GUIDE" else u.driver_profile)
            parts.append(f"""
Provider the traveller is looking at:
- Name: {u.full_name} ({u.role.lower()})
- Experience: {profile.years_experience if profile else '?'} years
- Languages: {', '.join(profile.languages or []) if profile else '?'}
- Rating: {profile.rating_avg if profile else '?'}/5
- Day rate: LKR {profile.daily_rate if profile else '?'}""")

            if u.role == "DRIVER" and profile:
                vs = db.query(Vehicle).filter(
                    Vehicle.driver_id == profile.id,
                    Vehicle.is_active.is_(True)).all()
                for v in vs:
                    parts.append(
                        f"- Vehicle: {v.vehicle_type} {v.model or ''}, {v.seats} seats, "
                        f"{'AC' if v.is_ac else 'non-AC'}, luggage: {v.luggage_capacity}"
                    )

    # ---- booking ----
    elif context_type == "BOOKING" and context_id:
        b = db.query(Booking).filter(Booking.id == context_id).first()
        if b and (b.traveler_id == user.id
                  or any(i.provider_id == user.id for i in b.items)):
            parts.append(f"""
Booking in question:
- Reference: {b.reference}
- Type: {b.booking_type}, status {b.status}, payment {b.payment_status}
- Dates: {b.start_date} to {b.end_date or b.start_date}
- Travellers: {b.num_travelers}
- Pickup: {b.pickup_location}
- Total: {b.currency} {b.total_amount}""")

            dest = (db.query(Destination).filter(Destination.id == b.destination_id).first()
                    if b.destination_id else None)
            parts.append(_destination_block(db, dest))
            parts.append(_weather_for(db, dest))

    # ---- trip plan ----
    if trip_plan_id:
        plan = (db.query(TripPlan)
                .filter(TripPlan.id == trip_plan_id,
                        TripPlan.traveler_id == user.id).first())
        if plan:
            items = (db.query(ItineraryItem)
                     .filter(ItineraryItem.trip_plan_id == plan.id)
                     .order_by(ItineraryItem.day_number,
                               ItineraryItem.sort_order).all())
            parts.append(f"\nTrip plan: {plan.title} ({plan.start_date} to {plan.end_date})")
            for i in items:
                parts.append(f"  Day {i.day_number} {i.start_time or ''} — "
                             f"{i.title} ({i.location_name or ''}), LKR {i.est_cost}")

            if plan.destination_id:
                d = db.query(Destination).filter(
                    Destination.id == plan.destination_id).first()
                parts.append(_weather_for(db, d))

    # ---- always: their live bookings ----
    bookings = (db.query(Booking)
                .filter(Booking.traveler_id == user.id,
                        Booking.status.in_(["PENDING", "CONFIRMED", "ACTIVE"]))
                .order_by(Booking.start_date).limit(5).all())
    if bookings:
        parts.append("\nTheir upcoming bookings:")
        for b in bookings:
            parts.append(f"  {b.reference}: {b.booking_type} on {b.start_date}, "
                         f"{b.num_travelers} people, {b.currency} {b.total_amount}, "
                         f"status {b.status}")

    text = "\n".join(p for p in parts if p and p.strip())
    return text or "No specific context — answer generally about travel in Sri Lanka."


def ask(db: Session, user, question: str, trip_plan_id=None,
        context_type=None, context_id=None) -> str:
    context = build_context(db, user, trip_plan_id, context_type, context_id)

    history = (db.query(AIMessage)
               .filter(AIMessage.user_id == user.id)
               .order_by(AIMessage.created_at.desc()).limit(6).all())
    history_text = "\n".join(f"{m.role}: {m.content}" for m in reversed(history))

    prompt = f"""Context:
{context}

Recent conversation:
{history_text or 'none'}

Question: {question}"""

    answer = gemini_service.generate_text(prompt, SYSTEM)

    db.add(AIMessage(user_id=user.id, role="user", content=question,
                     context_type=context_type or "GENERAL", context_id=context_id))
    db.add(AIMessage(user_id=user.id, role="assistant", content=answer,
                     context_type=context_type or "GENERAL", context_id=context_id))
    db.commit()

    return answer