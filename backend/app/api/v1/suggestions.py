from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import Role, SuggestionKind, VerificationStatus
from app.db.session import get_db
from app.models.destination import DestinationSuggestion
from app.models.user import User
from app.schemas.admin import SuggestionCreate, SuggestionOut
from app.schemas.report import ReportCreate
from app.models.social import Report

router = APIRouter(tags=["suggestions"])


@router.post("/suggestions", response_model=SuggestionOut, status_code=201)
def submit_suggestion(data: SuggestionCreate,
                      user: User = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if user.role not in (Role.GUIDE, Role.DRIVER):
        raise HTTPException(403, "Only guides and drivers can suggest destinations")
    if data.kind == SuggestionKind.NEW and not data.name:
        raise HTTPException(400, "Destination name is required")
    if data.kind == SuggestionKind.UPDATE and not data.target_destination_id:
        raise HTTPException(400, "Target destination is required for an update")

    s = DestinationSuggestion(submitted_by=user.id,
                              status=VerificationStatus.PENDING,
                              **data.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return SuggestionOut(**{k: getattr(s, k) for k in
                            ("id", "kind", "submitted_by", "target_destination_id",
                             "name", "region", "lat", "lng", "description",
                             "why_popular", "activities", "photos", "status",
                             "admin_note", "created_at")},
                         submitter_name=user.full_name)


@router.get("/suggestions/mine", response_model=list[SuggestionOut])
def my_suggestions(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    rows = (db.query(DestinationSuggestion)
            .filter(DestinationSuggestion.submitted_by == user.id)
            .order_by(DestinationSuggestion.created_at.desc()).all())
    return [SuggestionOut(**{k: getattr(s, k) for k in
                             ("id", "kind", "submitted_by", "target_destination_id",
                              "name", "region", "lat", "lng", "description",
                              "why_popular", "activities", "photos", "status",
                              "admin_note", "created_at")},
                          submitter_name=user.full_name) for s in rows]


@router.post("/reports", status_code=201)
def submit_report(data: ReportCreate,
                  user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    r = Report(reporter_id=user.id, **data.model_dump())
    db.add(r)
    db.commit()
    return {"id": str(r.id), "status": r.status}