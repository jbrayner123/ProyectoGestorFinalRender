from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6)
    current_password: str = Field(..., min_length=1)

class UserDelete(BaseModel):
    current_password: str = Field(..., min_length=1)

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        orm_mode = True

# Compatibilidad Pydantic v2
try:
    from pydantic import ConfigDict
    UserOut.model_config = ConfigDict(from_attributes=True)
except ImportError:
    pass