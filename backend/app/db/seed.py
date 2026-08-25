"""Seed the database with starter data. Safe to re-run."""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.enums import (AvailabilityStatus, ContentStatus, Role,
                            VerificationStatus)
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.destination import (Destination, DestinationCategory,
                                    DestinationPhoto)
from app.models.package import Availability, Package, PackageDate, PackagePhoto
from app.models.user import DriverProfile, GuideProfile, TravelerProfile, User

CATEGORIES = [
    ("Beach", "beach", "waves"),
    ("Hill Country", "hill-country", "mountain"),
    ("Cultural", "cultural", "landmark"),
    ("Wildlife", "wildlife", "paw"),
    ("Adventure", "adventure", "compass"),
]

DESTINATIONS = [
    {
        "name": "Sigiriya Rock Fortress", "slug": "sigiriya", "cat": "cultural",
        "region": "Central Province", "lat": 7.9570, "lng": 80.7603,
        "description": "An ancient rock fortress rising 200m from the jungle, crowned "
                       "with palace ruins and famous for its frescoes and mirror wall.",
        "best": "January to April", "min": 8000, "max": 20000,
        "activities": ["Hiking", "Photography", "History Tour"],
        "clothing": ["Light cotton clothes", "Hat", "Comfortable shoes"],
        "items": ["Water bottle", "Sunscreen", "Camera"],
        "attractions": [{"name": "Lion's Paw Terrace"}, {"name": "Mirror Wall"},
                        {"name": "Frescoes"}],
        "warnings": "Steep climb with narrow stairs. Avoid midday heat. Wasps occasionally active.",
        "featured": True, "trending": True,
        "photo": "https://images.unsplash.com/photo-1586094676111-f5b2f0d0b1a1?w=1200",
    },
    {
        "name": "Ella", "slug": "ella", "cat": "hill-country",
        "region": "Uva Province", "lat": 6.8667, "lng": 81.0466,
        "description": "A misty mountain village known for tea plantations, waterfalls, "
                       "the Nine Arch Bridge and sweeping views from Little Adam's Peak.",
        "best": "December to March", "min": 6000, "max": 18000,
        "activities": ["Hiking", "Train Ride", "Tea Tasting", "Waterfalls"],
        "clothing": ["Layers", "Light jacket", "Hiking shoes"],
        "items": ["Rain jacket", "Power bank", "Insect repellent"],
        "attractions": [{"name": "Nine Arch Bridge"}, {"name": "Little Adam's Peak"},
                        {"name": "Ravana Falls"}],
        "warnings": "Trails get slippery after rain. Leeches common in wet season.",
        "featured": True, "trending": True,
        "photo": "https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?w=1200",
    },
    {
        "name": "Mirissa Beach", "slug": "mirissa", "cat": "beach",
        "region": "Southern Province", "lat": 5.9483, "lng": 80.4589,
        "description": "A crescent bay with calm turquoise water, palm-fringed sand and "
                       "the country's best whale watching between November and April.",
        "best": "November to April", "min": 7000, "max": 25000,
        "activities": ["Whale Watching", "Surfing", "Snorkelling", "Beach Relaxation"],
        "clothing": ["Swimwear", "Light clothes", "Sandals"],
        "items": ["Reef-safe sunscreen", "Dry bag", "Sunglasses"],
        "attractions": [{"name": "Parrot Rock"}, {"name": "Coconut Tree Hill"},
                        {"name": "Secret Beach"}],
        "warnings": "Strong currents outside the bay. Check conditions before swimming.",
        "featured": True, "trending": False,
        "photo": "https://images.unsplash.com/photo-1590766940554-153a4d9f6e0f?w=1200",
    },
    {
        "name": "Yala National Park", "slug": "yala", "cat": "wildlife",
        "region": "Southern Province", "lat": 6.3728, "lng": 81.5016,
        "description": "Sri Lanka's most visited national park, with the highest leopard "
                       "density in the world plus elephants, sloth bears and crocodiles.",
        "best": "February to July", "min": 12000, "max": 35000,
        "activities": ["Safari", "Bird Watching", "Photography"],
        "clothing": ["Neutral colours", "Long sleeves", "Closed shoes"],
        "items": ["Binoculars", "Zoom lens", "Dust mask"],
        "attractions": [{"name": "Block 1"}, {"name": "Sithulpawwa Temple"}],
        "warnings": "Park closes in September for maintenance. Book safaris ahead.",
        "featured": False, "trending": True,
        "photo": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200",
    },
    {
        "name": "Galle Fort", "slug": "galle-fort", "cat": "cultural",
        "region": "Southern Province", "lat": 6.0269, "lng": 80.2170,
        "description": "A UNESCO-listed Dutch colonial fort with cobbled streets, "
                       "boutique cafes, ramparts and a working lighthouse.",
        "best": "December to April", "min": 5000, "max": 15000,
        "activities": ["Walking Tour", "Shopping", "Photography", "Cafes"],
        "clothing": ["Light clothes", "Hat", "Walking shoes"],
        "items": ["Water bottle", "Camera", "Cash for small shops"],
        "attractions": [{"name": "Lighthouse"}, {"name": "Ramparts"},
                        {"name": "Dutch Reformed Church"}],
        "warnings": "Very hot midday. Best explored early morning or at sunset.",
        "featured": True, "trending": False,
        "photo": "https://images.unsplash.com/photo-1580889240912-c39ecefd3d95?w=1200",
    },
    {
        "name": "Nuwara Eliya", "slug": "nuwara-eliya", "cat": "hill-country",
        "region": "Central Province", "lat": 6.9497, "lng": 80.7891,
        "description": "Cool colonial hill town at 1,868m, surrounded by tea estates, "
                       "with a lake, botanical gardens and English-style architecture.",
        "best": "March to May", "min": 7000, "max": 22000,
        "activities": ["Tea Factory Tour", "Boating", "Gardens", "Hiking"],
        "clothing": ["Warm jacket", "Long trousers", "Closed shoes"],
        "items": ["Umbrella", "Thermal layer", "Camera"],
        "attractions": [{"name": "Gregory Lake"}, {"name": "Horton Plains"},
                        {"name": "Pedro Tea Estate"}],
        "warnings": "Nights drop below 10°C. Frequent rain and fog.",
        "featured": False, "trending": True,
        "photo": "https://images.unsplash.com/photo-1594818379496-da1e345b0ded?w=1200",
    },
]


def seed(db: Session) -> None:
    # ---------- categories ----------
    cat_map = {}
    for name, slug, icon in CATEGORIES:
        row = db.query(DestinationCategory).filter_by(slug=slug).first()
        if not row:
            row = DestinationCategory(name=name, slug=slug, icon=icon)
            db.add(row)
            db.flush()
        cat_map[slug] = row.id
    print(f"categories: {len(cat_map)}")

    # ---------- admin ----------
    admin = db.query(User).filter_by(email="admin@roamie.com").first()
    if not admin:
        admin = User(
            email="admin@roamie.com",
            password_hash=hash_password("Admin@1234"),
            full_name="Roamie Admin",
            role=Role.ADMIN,
            is_verified=True,
        )
        db.add(admin)
        db.flush()
    print("admin ready")

    # ---------- guides ----------
    guides = []
    guide_data = [
        ("kamal@roamie.com", "Kamal Perera", 8,
         ["English", "Sinhala", "German"], ["Cultural", "Hiking"],
         "Licensed national guide with 8 years leading cultural and hill-country tours."),
        ("nimali@roamie.com", "Nimali Fernando", 5,
         ["English", "Sinhala", "French"], ["Wildlife", "Beach"],
         "Wildlife specialist and former park ranger. Safari and coastal tours."),
    ]
    for email, name, exp, langs, specs, bio in guide_data:
        u = db.query(User).filter_by(email=email).first()
        if not u:
            u = User(email=email, password_hash=hash_password("Guide@1234"),
                     full_name=name, role=Role.GUIDE, is_verified=True,
                     country="Sri Lanka")
            db.add(u)
            db.flush()
            p = GuideProfile(
                user_id=u.id, bio=bio, years_experience=exp, languages=langs,
                specializations=specs,
                qualifications="SLTDA Registered Tourist Guide",
                verification_status=VerificationStatus.APPROVED,
                rating_avg=Decimal("4.7"), rating_count=23,
            )
            db.add(p)
            db.flush()
        guides.append(db.query(GuideProfile).filter_by(user_id=u.id).first())
    print(f"guides: {len(guides)}")

    # ---------- drivers ----------
    driver_data = [
        ("sunil@roamie.com", "Sunil Jayawardena", 12, ["English", "Sinhala"], "B1234567"),
        ("ravi@roamie.com", "Ravi Kumar", 6, ["English", "Tamil", "Sinhala"], "B7654321"),
    ]
    for email, name, exp, langs, lic in driver_data:
        u = db.query(User).filter_by(email=email).first()
        if not u:
            u = User(email=email, password_hash=hash_password("Driver@1234"),
                     full_name=name, role=Role.DRIVER, is_verified=True,
                     country="Sri Lanka")
            db.add(u)
            db.flush()
            db.add(DriverProfile(
                user_id=u.id,
                bio=f"Professional driver with {exp} years of tourist transport experience.",
                years_experience=exp, languages=langs, license_no=lic,
                verification_status=VerificationStatus.APPROVED,
                rating_avg=Decimal("4.8"), rating_count=41,
            ))
            db.flush()
    print("drivers: 2")

    # ---------- destinations ----------
    dest_map = {}
    for d in DESTINATIONS:
        row = db.query(Destination).filter_by(slug=d["slug"]).first()
        if not row:
            row = Destination(
                name=d["name"], slug=d["slug"], description=d["description"],
                country="Sri Lanka", region=d["region"],
                lat=Decimal(str(d["lat"])), lng=Decimal(str(d["lng"])),
                category_id=cat_map[d["cat"]],
                best_time_to_visit=d["best"],
                est_cost_min=Decimal(str(d["min"])), est_cost_max=Decimal(str(d["max"])),
                popular_attractions=d["attractions"], activities=d["activities"],
                recommended_clothing=d["clothing"], necessary_items=d["items"],
                travel_warnings=d["warnings"],
                is_featured=d["featured"], is_trending=d["trending"],
                status=ContentStatus.ACTIVE, created_by=admin.id,
                rating_avg=Decimal("4.6"),
            )
            db.add(row)
            db.flush()
            db.add(DestinationPhoto(destination_id=row.id, url=d["photo"], sort_order=0))
        dest_map[d["slug"]] = row.id
    print(f"destinations: {len(dest_map)}")

    # ---------- packages ----------
    pkg_data = [
        {
            "guide": 0, "dest": "sigiriya",
            "title": "Sigiriya & Dambulla Heritage Day Tour",
            "desc": "Climb the rock fortress at sunrise, then explore the Dambulla cave "
                    "temples with a licensed cultural guide. Entrance fees included.",
            "type": "Cultural", "days": 1, "price": 18500, "max": 6,
            "activities": ["Rock Climbing", "Cave Temple Visit", "Photography"],
            "incl": ["Guide", "Entrance tickets", "Lunch", "Bottled water"],
            "excl": ["Personal expenses", "Tips"],
            "transport": True, "vehicle": "Toyota KDH Van", "seats": 8, "ac": True,
            "pickup": "Hotel pickup in Dambulla/Sigiriya area, 5:30 AM",
            "dropoff": "Return to hotel by 4:00 PM",
            "driver_info": "Vehicle and driver arranged by the guide.",
            "photo": "https://images.unsplash.com/photo-1586094676111-f5b2f0d0b1a1?w=1200",
        },
        {
            "guide": 0, "dest": "ella",
            "title": "Ella Hill Country 2-Day Escape",
            "desc": "Nine Arch Bridge at train time, Little Adam's Peak sunrise, "
                    "Ravana Falls and a working tea factory tour.",
            "type": "Adventure", "days": 2, "price": 32000, "max": 8,
            "activities": ["Hiking", "Train Ride", "Tea Tasting", "Waterfalls"],
            "incl": ["Guide", "1 night accommodation", "Breakfast", "Train tickets"],
            "excl": ["Dinner", "Personal expenses"],
            "transport": False, "vehicle": None, "seats": None, "ac": None,
            "pickup": "Meet at Ella railway station",
            "dropoff": "Ella town centre",
            "driver_info": None,
            "photo": "https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?w=1200",
        },
        {
            "guide": 1, "dest": "yala",
            "title": "Yala Leopard Safari — Full Day",
            "desc": "Two game drives with a former park ranger. Dawn start for the best "
                    "leopard sightings, jeep and park fees included.",
            "type": "Wildlife", "days": 1, "price": 26000, "max": 6,
            "activities": ["Safari", "Bird Watching", "Photography"],
            "incl": ["Ranger guide", "Safari jeep", "Park entrance", "Breakfast", "Lunch"],
            "excl": ["Camera fees", "Tips"],
            "transport": True, "vehicle": "4x4 Safari Jeep", "seats": 6, "ac": False,
            "pickup": "Tissamaharama hotels, 4:30 AM",
            "dropoff": "Return by 6:00 PM",
            "driver_info": "Safari jeep and driver arranged by the guide.",
            "photo": "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1200",
        },
        {
            "guide": 1, "dest": "mirissa",
            "title": "Mirissa Whale Watching & Beach Day",
            "desc": "Early boat trip for blue whales and dolphins, followed by a guided "
                    "walk to Coconut Tree Hill and Secret Beach.",
            "type": "Beach", "days": 1, "price": 14500, "max": 10,
            "activities": ["Whale Watching", "Snorkelling", "Beach Walk"],
            "incl": ["Guide", "Boat ticket", "Breakfast on board", "Life jacket"],
            "excl": ["Snorkel gear rental", "Lunch"],
            "transport": False, "vehicle": None, "seats": None, "ac": None,
            "pickup": "Mirissa harbour, 6:00 AM",
            "dropoff": "Mirissa beach",
            "driver_info": None,
            "photo": "https://images.unsplash.com/photo-1590766940554-153a4d9f6e0f?w=1200",
        },
    ]

    made = 0
    for p in pkg_data:
        if db.query(Package).filter_by(title=p["title"]).first():
            continue
        pkg = Package(
            guide_id=guides[p["guide"]].id,
            title=p["title"], description=p["desc"],
            destination_id=dest_map[p["dest"]],
            package_type=p["type"], duration_days=p["days"],
            price=Decimal(str(p["price"])), currency="LKR",
            max_travelers=p["max"], activities=p["activities"],
            included=p["incl"], excluded=p["excl"],
            transport_included=p["transport"], vehicle_type=p["vehicle"],
            vehicle_seats=p["seats"], is_ac=p["ac"],
            pickup_info=p["pickup"], dropoff_info=p["dropoff"],
            driver_info=p["driver_info"],
            status=ContentStatus.ACTIVE,
            rating_avg=Decimal("4.7"), rating_count=12,
        )
        db.add(pkg)
        db.flush()
        db.add(PackagePhoto(package_id=pkg.id, url=p["photo"], sort_order=0))

        start = date.today() + timedelta(days=7)
        for w in range(4):
            s = start + timedelta(weeks=w)
            db.add(PackageDate(
                package_id=pkg.id, start_date=s,
                end_date=s + timedelta(days=p["days"] - 1),
                slots_total=p["max"], slots_booked=0,
            ))
        made += 1
    print(f"packages: {made} new")

    # ---------- availability for providers ----------
    providers = db.query(User).filter(User.role.in_([Role.GUIDE, Role.DRIVER])).all()
    today = date.today()
    added = 0
    for prov in providers:
        for i in range(1, 31):
            d = today + timedelta(days=i)
            exists = db.query(Availability).filter_by(provider_id=prov.id, date=d).first()
            if not exists:
                db.add(Availability(provider_id=prov.id, date=d,
                                    status=AvailabilityStatus.AVAILABLE))
                added += 1
    print(f"availability rows: {added}")

    db.commit()
    print("\nSeed complete.")
    print("  admin@roamie.com  / Admin@1234")
    print("  kamal@roamie.com  / Guide@1234")
    print("  sunil@roamie.com  / Driver@1234")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()