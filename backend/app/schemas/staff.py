from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class StaffCreateRequest(BaseModel):
    email: EmailStr = Field(..., description="Corporate or institution email of the staff member")
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, description="Full legal name of the staff officer")
    role: str = Field("tpo_staff", description="User role: 'tpo_staff' or 'tpo_admin'")
    designation: Optional[str] = Field("Placement Coordinator", description="Job designation / office role")
    permissions: List[str] = Field(default_factory=list, description="Assigned granular permissions")

class StaffAccessUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2)
    role: Optional[str] = Field(None, description="'tpo_staff' or 'tpo_admin'")
    designation: Optional[str] = Field(None, description="Updated job designation")
    permissions: Optional[List[str]] = Field(None, description="Updated list of granular permissions")

class StaffPasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=6, description="New password with at least 6 characters")

class StaffStatusUpdateRequest(BaseModel):
    is_active: bool = Field(..., description="Account activation state")

class StaffResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    designation: str = "Placement Officer"
    permissions: List[str] = []
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
