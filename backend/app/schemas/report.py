from uuid import UUID

from pydantic import BaseModel


class ReportCreate(BaseModel):
    target_type: str
    target_id: UUID
    reason: str
    description: str | None = None