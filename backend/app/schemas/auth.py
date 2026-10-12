from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, description="Full student name")
    roll_number: Optional[str] = Field(None, description="College Roll or Registration Number")
    department: Optional[str] = Field(None, description="Department or Branch (e.g. CSE, IT)")
    graduation_year: Optional[int] = Field(None, description="Expected Graduation Year (e.g. 2026)")

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    full_name: str
    email: str
    designation: Optional[str] = None
    permissions: Optional[list[str]] = None
    is_verified: Optional[bool] = True

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    is_verified: Optional[bool] = True
    designation: Optional[str] = None
    permissions: Optional[list[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, description="Updated full name")
    email: Optional[EmailStr] = Field(None, description="Updated email address")
    phone: Optional[str] = Field(None, description="Updated phone number")

class UserChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current password for identity verification")
    new_password: str = Field(..., min_length=6, description="New password with minimum 6 characters")
