from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import Role
from app.db.session import get_db
from app.models.booking import Booking
from app.models.destination import Destination
from app.models.user import User
from app.services import weather_service

router = APIRouter(prefix="/weather", tags=["weather"])

FORECAST_HORIZON = 5   # OpenWeather free tier


class DayForecast(BaseModel):
    date: str
    condition: str | None = None
    temp_min: float | None = None
    temp_max: float | None = None
    rain_mm: float | None = None
    will_rain: bool = False


class WeatherOut(BaseModel):
    mode: str                      # FORECAST | SEASONAL | UNAVAILABLE
    destination_name: str | None = None
    days: list[DayForecast] = []
    best_time_to_visit: str | None = None
    recommended_clothing: list[str] | None = None
    necessary_items: list[str] | None = None
    travel_warnings: str | None = None
    note: str | None = None
    advice: list[str] = []


def _advice(days: list[dict]) -> list[str]:
    """Turn raw forecast into things a traveller should actually do."""
    out = []
    rainy = [d for d in days if d.get("will_rain")]
    if rainy:
        when = ", ".join(
            date.fromisoformat(d["date"]).strftime("%a %-d %b") for d in rainy[:3]
        )
        out.append(f"Rain expected on {when} — pack a light rain jacket and dry bag.")

    hot = [d for d in days if (d.get("temp_max") or 0) >= 32]
    if hot:
        out.append("Above 32°C on some days. Start early and carry more water than you think.")

    cold = [d for d in days if (d.get("temp_min") or 99) <= 16]
    if cold:
        out.append("Nights drop below 16°C. Bring a warm layer for evenings.")

    if days and not rainy and not hot and not cold:
        out.append("Conditions look comfortable across your dates.")

    return out


@router.get("/booking/{booking_id}", response_model=WeatherOut)
def booking_weather(booking_id: UUID,
                    user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(404, "Booking not found")

    allowed = (user.role == Role.ADMIN
               or booking.traveler_id == user.id
               or any(i.provider_id == user.id for i in booking.items))
    if not allowed:
        raise HTTPException(403, "Not your booking")

    dest = None
    if booking.destination_id:
        dest = db.query(Destination).filter(
            Destination.id == booking.destination_id).first()

    if not dest or not dest.lat:
        return WeatherOut(
            mode="UNAVAILABLE",
            note="No destination coordinates on this booking, so we can't check the weather.",
        )

    base = dict(
        destination_name=dest.name,
        best_time_to_visit=dest.best_time_to_visit,
        recommended_clothing=dest.recommended_clothing,
        necessary_items=dest.necessary_items,
        travel_warnings=dest.travel_warnings,
    )

    days_until = (booking.start_date - date.today()).days

    # too far out for a real forecast
    if days_until > FORECAST_HORIZON:
        return WeatherOut(
            mode="SEASONAL",
            note=f"Your trip is {days_until} days away. Forecasts reach about "
                 f"{FORECAST_HORIZON} days ahead, so here's what to expect for the season.",
            advice=[a for a in [
                f"Best time to visit is {dest.best_time_to_visit}."
                if dest.best_time_to_visit else None,
                "Check back a few days before you travel for the actual forecast.",
            ] if a],
            **base,
        )

    forecast = weather_service.get_forecast(db, dest.lat, dest.lng, FORECAST_HORIZON)
    if not forecast:
        return WeatherOut(
            mode="SEASONAL",
            note="Live weather isn't available right now. Here's what's typical.",
            **base,
        )

    # keep only days that fall inside the trip
    end = booking.end_date or booking.start_date
    trip_days = [
        f for f in forecast
        if booking.start_date <= date.fromisoformat(f["date"]) <= end
    ] or forecast

    return WeatherOut(
        mode="FORECAST",
        days=[DayForecast(**d) for d in trip_days],
        advice=_advice(trip_days),
        **base,
    )


@router.get("/destination/{slug}", response_model=WeatherOut)
def destination_weather(slug: str, db: Session = Depends(get_db)):
    """Public — current forecast for a destination page."""
    dest = db.query(Destination).filter(Destination.slug == slug).first()
    if not dest:
        raise HTTPException(404, "Destination not found")

    base = dict(
        destination_name=dest.name,
        best_time_to_visit=dest.best_time_to_visit,
        recommended_clothing=dest.recommended_clothing,
        necessary_items=dest.necessary_items,
        travel_warnings=dest.travel_warnings,
    )

    if not dest.lat:
        return WeatherOut(mode="UNAVAILABLE", **base)

    forecast = weather_service.get_forecast(db, dest.lat, dest.lng, FORECAST_HORIZON)
    if not forecast:
        return WeatherOut(mode="SEASONAL", **base)

    return WeatherOut(mode="FORECAST", days=[DayForecast(**d) for d in forecast],
                      advice=_advice(forecast), **base)