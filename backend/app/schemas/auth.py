from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=150)
    role: str = "TRAVELER"
    phone: str | None = None
    country: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    phone: str | None = None
    country: str | None = None
    avatar_url: str | None = None
    is_active: bool
    is_verified: bool

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    country: str | None = None
    avatar_url: str | None = None