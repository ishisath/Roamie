from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai import WeatherCache

BASE = "https://api.openweathermap.org/data/2.5"


def _round(v) -> Decimal:
    return Decimal(str(round(float(v), 2)))


def get_forecast(db: Session, lat, lng, days: int = 5) -> list[dict]:
    """5-day forecast, cached per rounded coordinate per day."""
    if not settings.OPENWEATHER_API_KEY:
        return []

    lat_r, lng_r = _round(lat), _round(lng)
    today = date.today()

    cached = (db.query(WeatherCache)
              .filter(WeatherCache.lat_r == lat_r,
                      WeatherCache.lng_r == lng_r,
                      WeatherCache.date >= today)
              .order_by(WeatherCache.date)
              .all())

    fresh_cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
    if cached and all(c.fetched_at and c.fetched_at > fresh_cutoff for c in cached):
        return [c.payload for c in cached[:days]]

    try:
        r = httpx.get(f"{BASE}/forecast", params={
            "lat": float(lat), "lon": float(lng),
            "appid": settings.OPENWEATHER_API_KEY, "units": "metric",
        }, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return [c.payload for c in cached[:days]] if cached else []

    by_day: dict[str, dict] = {}
    for slot in data.get("list", []):
        d = slot["dt_txt"][:10]
        entry = by_day.setdefault(d, {
            "date": d, "temp_min": 99, "temp_max": -99,
            "conditions": [], "rain_mm": 0.0,
        })
        entry["temp_min"] = min(entry["temp_min"], slot["main"]["temp_min"])
        entry["temp_max"] = max(entry["temp_max"], slot["main"]["temp_max"])
        entry["conditions"].append(slot["weather"][0]["main"])
        entry["rain_mm"] += slot.get("rain", {}).get("3h", 0)

    results = []
    for d, entry in sorted(by_day.items())[:days]:
        conditions = entry.pop("conditions")
        entry["condition"] = max(set(conditions), key=conditions.count)
        entry["temp_min"] = round(entry["temp_min"], 1)
        entry["temp_max"] = round(entry["temp_max"], 1)
        entry["rain_mm"] = round(entry["rain_mm"], 1)
        entry["will_rain"] = entry["rain_mm"] > 1

        row = (db.query(WeatherCache)
               .filter(WeatherCache.lat_r == lat_r, WeatherCache.lng_r == lng_r,
                       WeatherCache.date == d).first())
        if row:
            row.payload = entry
            row.fetched_at = datetime.now(timezone.utc)
        else:
            db.add(WeatherCache(lat_r=lat_r, lng_r=lng_r, date=d,
                                payload=entry, fetched_at=datetime.now(timezone.utc)))
        results.append(entry)

    db.commit()
    return results