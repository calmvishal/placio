from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique notification identifier")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification body content")
    type: str = Field("general", description="Notification category/type")
    link: Optional[str] = Field(None, description="In-app link destination")
    read: bool = Field(False, description="Read status flag")
    created_at: datetime = Field(..., description="Creation timestamp")

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int
    total_count: int
