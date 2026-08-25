from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.social import Notification
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str | None = None
    link: str | None = None
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


@router.get("", response_model=list[NotificationOut])
def list_notifications(unread_only: bool = False,
                       limit: int = Query(30, le=100),
                       user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read.is_(False))
    return q.order_by(Notification.created_at.desc()).limit(limit).all()


@router.get("/unread-count")
def unread_count(user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    count = (db.query(Notification)
             .filter(Notification.user_id == user.id,
                     Notification.is_read.is_(False)).count())
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: UUID,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    n = (db.query(Notification)
         .filter(Notification.id == notification_id,
                 Notification.user_id == user.id).first())
    if not n:
        raise HTTPException(404, "Notification not found")
    n.is_read = True
    db.commit()
    db.refresh(n)
    return n


@router.patch("/read-all")
def mark_all_read(user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    updated = (db.query(Notification)
               .filter(Notification.user_id == user.id,
                       Notification.is_read.is_(False))
               .update({"is_read": True}, synchronize_session=False))
    db.commit()
    return {"updated": updated}