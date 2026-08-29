from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_verified_provider, require_role
from app.core.enums import (BidStatus, BookingStatus, ProviderStatus,
                            RequestStatus, Role, ServiceType)
from app.db.session import get_db
from app.models.booking import Bid, Booking, BookingItem, TripRequest
from app.models.destination import Destination
from app.models.user import DriverProfile, GuideProfile, User, Vehicle
from app.schemas.bid import (BidCreate, BidOut, TripRequestCreate,
                             TripRequestOut)
from app.services import booking_service, notification_service

router = APIRouter(tags=["bidding"])


def _bid_out(db: Session, b: Bid) -> BidOut:
    provider = db.query(User).filter(User.id == b.provider_id).first()
    rating = experience = None
    if provider:
        profile = (provider.guide_profile if b.provider_role == Role.GUIDE
                   else provider.driver_profile)
        if profile:
            rating, experience = profile.rating_avg, profile.years_experience

    summary = None
    if b.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.id == b.vehicle_id).first()
        if v:
            summary = (f"{v.vehicle_type} · {v.seats} seats · "
                       f"{'AC' if v.is_ac else 'Non-AC'}")

    return BidOut(
        id=b.id, request_id=b.request_id, provider_id=b.provider_id,
        provider_name=provider.full_name if provider else None,
        provider_role=b.provider_role, provider_rating=rating,
        provider_experience=experience, price=b.price,
        vehicle_id=b.vehicle_id, vehicle_summary=summary,
        duration_days=b.duration_days, included_services=b.included_services,
        notes=b.notes, status=b.status,
    )


def _request_out(db: Session, r: TripRequest, with_bids: bool = False) -> TripRequestOut:
    traveler = db.query(User).filter(User.id == r.traveler_id).first()
    dest = (db.query(Destination).filter(Destination.id == r.destination_id).first()
            if r.destination_id else None)
    bids = db.query(Bid).filter(Bid.request_id == r.id).all()

    return TripRequestOut(
                **{k: getattr(r, k) for k in
           ("id", "traveler_id", "kind", "destination_id", "destination_text",
            "pickup_location", "pickup_lat", "pickup_lng",
            "start_date", "end_date", "num_people", "vehicle_requirements",
            "tourist_requirements", "budget_min", "budget_max", "notes", "status")},
        
        traveler_name=traveler.full_name if traveler else None,
        destination_name=dest.name if dest else r.destination_text,
        bid_count=len(bids),
        bids=[_bid_out(db, b) for b in bids] if with_bids else [],
    )


# ---------- traveller side ----------

@router.post("/requests", response_model=TripRequestOut, status_code=201)
def create_request(data: TripRequestCreate,
                   user: User = Depends(require_role(Role.TRAVELER)),
                   db: Session = Depends(get_db)):
    if data.kind not in ("GUIDE", "DRIVER", "BOTH"):
        raise HTTPException(400, "Kind must be GUIDE, DRIVER or BOTH")

    r = TripRequest(traveler_id=user.id, status=RequestStatus.OPEN,
                    **data.model_dump())
    db.add(r)
    db.flush()

    roles = ([Role.GUIDE, Role.DRIVER] if data.kind == "BOTH"
             else [Role.GUIDE if data.kind == "GUIDE" else Role.DRIVER])
    providers = (db.query(User)
                 .filter(User.role.in_(roles), User.is_active.is_(True)).all())
    notification_service.notify_many(
        db, [p.id for p in providers], "NEW_REQUEST",
        "New trip request", f"A traveller needs a {data.kind.lower()} on {data.start_date}.",
        "/requests",
    )

    db.commit()
    db.refresh(r)
    return _request_out(db, r)


@router.get("/requests/mine", response_model=list[TripRequestOut])
def my_requests(user: User = Depends(require_role(Role.TRAVELER)),
                db: Session = Depends(get_db)):
    rows = (db.query(TripRequest)
            .filter(TripRequest.traveler_id == user.id)
            .order_by(TripRequest.created_at.desc()).all())
    return [_request_out(db, r, with_bids=True) for r in rows]


@router.post("/bids/{bid_id}/accept", response_model=dict)
def accept_bid(bid_id: UUID,
               user: User = Depends(require_role(Role.TRAVELER)),
               db: Session = Depends(get_db)):
    bid = db.query(Bid).filter(Bid.id == bid_id).first()
    if not bid:
        raise HTTPException(404, "Bid not found")

    req = db.query(TripRequest).filter(TripRequest.id == bid.request_id).first()
    if not req or req.traveler_id != user.id:
        raise HTTPException(403, "Not your request")
    if req.status != RequestStatus.OPEN:
        raise HTTPException(400, "This request is already closed")

    # build a booking from the winning bid
    booking = Booking(
        reference=booking_service.make_reference(),
        traveler_id=user.id,
        booking_type="BID",
        status=BookingStatus.PENDING,
        destination_id=req.destination_id,
        start_date=req.start_date,
        end_date=req.end_date,
        num_travelers=req.num_people,
        pickup_location=req.pickup_location,
        total_amount=bid.price,
        notes=req.notes,
    )
    db.add(booking)
    db.flush()

    fee = (Decimal(str(bid.price)) * Decimal("0.10")).quantize(Decimal("0.01"))
    db.add(BookingItem(
        booking_id=booking.id,
        service_type=(ServiceType.GUIDE if bid.provider_role == Role.GUIDE
                      else ServiceType.DRIVER),
        provider_id=bid.provider_id,
        vehicle_id=bid.vehicle_id,
        package_id=bid.package_id,
        amount=bid.price,
        platform_fee=fee,
        provider_net=Decimal(str(bid.price)) - fee,
        provider_status=ProviderStatus.PENDING,
    ))

    bid.status = BidStatus.ACCEPTED
    req.status = RequestStatus.AWARDED

    for other in db.query(Bid).filter(Bid.request_id == req.id, Bid.id != bid.id).all():
        other.status = BidStatus.REJECTED
        notification_service.notify(
            db, other.provider_id, "BID_REJECTED", "Your bid wasn't selected",
            "The traveller chose another provider.")

    notification_service.notify(
        db, bid.provider_id, "BID_ACCEPTED", "Your bid was accepted",
        f"Booking {booking.reference} — awaiting payment.",
        f"/provider/bookings/{booking.id}")

    db.commit()
    return {"booking_id": str(booking.id), "reference": booking.reference}


@router.delete("/requests/{request_id}", status_code=204)
def close_request(request_id: UUID,
                  user: User = Depends(require_role(Role.TRAVELER)),
                  db: Session = Depends(get_db)):
    r = db.query(TripRequest).filter(TripRequest.id == request_id).first()
    if not r or r.traveler_id != user.id:
        raise HTTPException(404, "Request not found")
    r.status = RequestStatus.CLOSED
    db.commit()


# ---------- provider side ----------

@router.get("/requests", response_model=list[TripRequestOut])
def open_requests(user: User = Depends(get_verified_provider),
                  db: Session = Depends(get_db)):
    """Open requests this provider can bid on."""
    wanted = ["BOTH", "GUIDE" if user.role == Role.GUIDE else "DRIVER"]
    rows = (db.query(TripRequest)
            .filter(TripRequest.status == RequestStatus.OPEN,
                    TripRequest.kind.in_(wanted))
            .order_by(TripRequest.start_date).all())

    out = []
    for r in rows:
        mine = (db.query(Bid)
                .filter(Bid.request_id == r.id, Bid.provider_id == user.id).first())
        item = _request_out(db, r)
        if mine:
            item.bids = [_bid_out(db, mine)]     # only their own bid
        out.append(item)
    return out


@router.post("/requests/{request_id}/bids", response_model=BidOut, status_code=201)
def submit_bid(request_id: UUID, data: BidCreate,
               user: User = Depends(get_verified_provider),
               db: Session = Depends(get_db)):
    req = db.query(TripRequest).filter(TripRequest.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != RequestStatus.OPEN:
        raise HTTPException(400, "This request is closed")

    if req.kind != "BOTH":
        expected = Role.GUIDE if req.kind == "GUIDE" else Role.DRIVER
        if user.role != expected:
            raise HTTPException(403, f"This request needs a {expected.lower()}")

    if db.query(Bid).filter(Bid.request_id == request_id,
                            Bid.provider_id == user.id).first():
        raise HTTPException(409, "You've already bid on this request")

    if data.vehicle_id:
        profile = db.query(DriverProfile).filter_by(user_id=user.id).first()
        v = db.query(Vehicle).filter(Vehicle.id == data.vehicle_id).first()
        if not v or not profile or v.driver_id != profile.id:
            raise HTTPException(400, "That vehicle isn't yours")

    bid = Bid(request_id=request_id, provider_id=user.id,
              provider_role=user.role, status=BidStatus.PENDING,
              **data.model_dump())
    db.add(bid)

    notification_service.notify(
        db, req.traveler_id, "NEW_BID", "New bid on your request",
        f"{user.full_name} bid LKR {data.price:,.0f}.", "/requests")

    db.commit()
    db.refresh(bid)
    return _bid_out(db, bid)


@router.get("/bids/mine", response_model=list[BidOut])
def my_bids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Provider account required")
    rows = (db.query(Bid).filter(Bid.provider_id == user.id)
            .order_by(Bid.created_at.desc()).all())
    return [_bid_out(db, b) for b in rows]