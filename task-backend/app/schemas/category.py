from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nombre de la categoría")
    color: Optional[str] = Field("#3B82F6", pattern="^#[0-9A-Fa-f]{6}$", description="Color en formato hexadecimal")
    icon: Optional[str] = Field("📁", max_length=50, description="Emoji o ícono")

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)

class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str
    user_id: int
    created_at: datetime
    task_count: Optional[int] = 0  # Número de tareas en esta categoría

    class Config:
        orm_mode = True

class CategoryListResponse(BaseModel):
    categories: List[CategoryOut]
    total: int

# Compatibilidad con Pydantic v2
try:
    from pydantic import ConfigDict
    CategoryOut.model_config = ConfigDict(from_attributes=True)
    CategoryListResponse.model_config = ConfigDict(from_attributes=True)
except ImportError:
    pass