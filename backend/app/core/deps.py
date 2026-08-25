from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.enums import Role, VerificationStatus
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import DriverProfile, GuideProfile, User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_token(creds.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = db.query(User).filter(User.id == UUID(payload["sub"])).first()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is deactivated")
    return user


def require_role(*roles: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user
    return checker


def get_verified_provider(user: User = Depends(get_current_user)) -> User:
    """Blocks guides/drivers who haven't been approved by an admin."""
    if user.role == Role.GUIDE:
        profile = user.guide_profile
    elif user.role == Role.DRIVER:
        profile = user.driver_profile
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Provider account required")

    if not profile or profile.verification_status != VerificationStatus.APPROVED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account pending admin verification")
    return user