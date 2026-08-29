from uuid import UUID

from sqlalchemy.orm import Session

from app.models.social import Notification
from app.models.user import User
from app.services import email_service


def notify(db: Session, user_id: UUID, type_: str, title: str,
           body: str | None = None, link: str | None = None,
           email: bool = True) -> Notification:
    """Writes an in-app notification, and emails it when it's worth an email."""
    n = Notification(user_id=user_id, type=type_, title=title,
                     body=body, link=link)
    db.add(n)

    if email and type_ in email_service.EMAILABLE:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email and user.email_notifications:
            cta_text, cta_path = email_service.cta_for(type_)
            email_service.send(
                to=user.email,
                subject=title,
                title=title,
                body=body or "",
                cta_text=cta_text,
                cta_path=cta_path or link,
            )

    return n


def notify_many(db: Session, user_ids: list, type_: str, title: str,
                body: str | None = None, link: str | None = None,
                email: bool = True) -> None:
    for uid in set(u for u in user_ids if u):
        notify(db, uid, type_, title, body, link, email)