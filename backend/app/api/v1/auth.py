from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.enums import Role
from app.core.security import (create_access_token, create_refresh_token,
                               decode_token, hash_password, verify_password)
from app.db.session import get_db
from app.models.user import DriverProfile, GuideProfile, TravelerProfile, User
from app.schemas.auth import (LoginIn, ProfileUpdate, RefreshIn, RegisterIn,
                              TokenOut, UserOut)

router = APIRouter(prefix="/auth", tags=["auth"])

PUBLIC_ROLES = {Role.TRAVELER, Role.GUIDE, Role.DRIVER}


def _tokens_for(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(str(user.id), user.role),
        refresh_token=create_refresh_token(str(user.id), user.role),
        user=UserOut.model_validate(user),
    )


@router.post("/register", response_model=TokenOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    role = data.role.upper()
    if role not in PUBLIC_ROLES:
        raise HTTPException(400, "Invalid role")

    if db.query(User).filter(User.email == data.email.lower()).first():
        raise HTTPException(409, "Email already registered")

    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=role,
        phone=data.phone,
        country=data.country,
    )
    db.add(user)
    db.flush()

    if role == Role.TRAVELER:
        db.add(TravelerProfile(user_id=user.id))
    elif role == Role.GUIDE:
        db.add(GuideProfile(user_id=user.id))
    elif role == Role.DRIVER:
        db.add(DriverProfile(user_id=user.id))

    db.commit()
    db.refresh(user)
    return _tokens_for(user)


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(403, "Account is deactivated")
    return _tokens_for(user)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    user = db.query(User).filter(User.id == UUID(payload["sub"])).first()
    if not user:
        raise HTTPException(401, "User not found")
    return _tokens_for(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
def update_me(data: ProfileUpdate,
              user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user