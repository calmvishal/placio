from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CourseCreateRequest(BaseModel):
    code: str = Field(..., min_length=2, max_length=20, description="Course/Branch code, e.g. CSE, AERO, MBA")
    name: str = Field(..., min_length=2, max_length=150, description="Full Department/Course name")
    description: Optional[str] = Field("", max_length=300)

class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = ""
    is_active: bool = True
    created_at: Optional[datetime] = None
