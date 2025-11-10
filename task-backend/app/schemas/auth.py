# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class RegisterIn(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None


# Compatibilidad pydantic v2: asignar model_config si existe ConfigDict
try:
    from pydantic import ConfigDict
    UserOut.model_config = ConfigDict(from_attributes=True)
except Exception:
    pass
