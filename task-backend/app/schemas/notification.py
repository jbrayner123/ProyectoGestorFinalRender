from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NotificationOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime
    task_title: Optional[str] = None

    class Config:
        orm_mode = True

class NotificationListResponse(BaseModel):
    notifications: list[NotificationOut]
    total: int
    unread_count: int

# Compatibilidad Pydantic v2
try:
    from pydantic import ConfigDict
    NotificationOut.model_config = ConfigDict(from_attributes=True)
    NotificationListResponse.model_config = ConfigDict(from_attributes=True)
except ImportError:
    pass