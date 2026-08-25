from uuid import UUID

from sqlalchemy.orm import Session

from app.models.social import Notification


def notify(db: Session, user_id: UUID, type_: str, title: str,
           body: str | None = None, link: str | None = None) -> Notification:
    n = Notification(user_id=user_id, type=type_, title=title,
                     body=body, link=link)
    db.add(n)
    return n


def notify_many(db: Session, user_ids: list, type_: str, title: str,
                body: str | None = None, link: str | None = None) -> None:
    for uid in set(u for u in user_ids if u):
        notify(db, uid, type_, title, body, link)