from pydantic import BaseModel, Field
from typing import List, Optional

class RegistrationSettingsResponse(BaseModel):
    registration_enabled: bool = True
    domain_restriction_enabled: bool = False
    allowed_email_domains: List[str] = Field(default_factory=lambda: ["college.edu"])
    require_manual_verification: bool = False
    auto_verify_allowed_domains: bool = True
    closed_message: str = "Student registrations are currently closed by the Placement Cell."

class RegistrationSettingsUpdateRequest(BaseModel):
    registration_enabled: Optional[bool] = None
    domain_restriction_enabled: Optional[bool] = None
    allowed_email_domains: Optional[List[str]] = None
    require_manual_verification: Optional[bool] = None
    auto_verify_allowed_domains: Optional[bool] = None
    closed_message: Optional[str] = None
