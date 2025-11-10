from typing import Optional, List
from pydantic import BaseModel, Field, validator
from enum import Enum
from datetime import date, datetime, time

class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    priority: TaskPriority = TaskPriority.medium
    important: bool = False
    user_id: Optional[int] = 1
    progress: Optional[int] = 0

    @validator("due_date")
    def due_date_not_in_past(cls, v):
        from datetime import date
        if v is not None and v < date.today():
            raise ValueError("due_date cannot be in the past")
        return v

    @validator("progress")
    def progress_range(cls, v):
        if v is None:
            return 0
        if v < 0 or v > 100:
            raise ValueError("progress must be between 0 and 100")
        return v

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    important: Optional[bool] = None
    user_id: Optional[int] = None

    @validator("due_date")
    def due_date_not_in_past(cls, v):
        from datetime import date
        if v is not None and v < date.today():
            raise ValueError("due_date cannot be in the past")
        return v

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    due_date: Optional[date]
    due_time: Optional[time]
    priority: TaskPriority
    status: TaskStatus
    progress: int
    important: bool
    user_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    is_overdue: bool = False

    class Config:
        orm_mode = True
