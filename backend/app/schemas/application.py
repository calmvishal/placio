from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

ALLOWED_STATUSES = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Assessment",
    "Interview Scheduled",
    "Selected",
    "Rejected",
    "Withdrawn",
]

class ApplicationCreateRequest(BaseModel):
    job_id: str
    resume_id: Optional[str] = None

class ApplicationStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Target recruitment stage")
    notes: Optional[str] = Field("", description="Optional notes regarding the transition")
    # Optional interview fields if transitioning to Interview Scheduled
    interview_date: Optional[datetime] = None
    interview_round: Optional[str] = "Technical Round 1"
    interview_mode: Optional[str] = "Online"
    interview_venue_or_link: Optional[str] = "https://meet.google.com/xyz-placement-interview"
    interview_instructions: Optional[str] = "Please be ready 10 minutes prior with student ID and resume copy."

class StatusHistoryItem(BaseModel):
    status: str
    updated_by: str
    updated_at: datetime
    notes: Optional[str] = ""

class StudentSnapshot(BaseModel):
    full_name: str
    email: str
    roll_number: Optional[str] = None
    department: str
    branch: str
    graduation_year: int
    tenth_percentage: float = 0.0
    twelfth_percentage: float = 0.0
    cgpa: float = 0.0
    active_backlogs: int = 0
    skills: List[str] = []
    resume_filename: Optional[str] = None

class ApplicationResponse(BaseModel):
    id: str
    job_id: str
    company_name: str
    job_title: str
    salary_package: str
    student_id: str
    user_id: str
    status: str
    student_snapshot: StudentSnapshot
    status_history: List[StatusHistoryItem]
    applied_at: datetime
    updated_at: datetime
    interview_details: Optional[Dict[str, Any]] = None

class BulkApplicationStatusUpdateRequest(BaseModel):
    application_ids: List[str] = Field(..., min_length=1, description="List of application IDs to update")
    status: str = Field(..., description="Target recruitment stage")
    notes: Optional[str] = Field("", description="Optional notes regarding the bulk transition")
    interview_date: Optional[datetime] = None
    interview_round: Optional[str] = "Technical Round 1"
    interview_mode: Optional[str] = "Online"
    interview_venue_or_link: Optional[str] = "https://meet.google.com/xyz-placement-interview"
    interview_instructions: Optional[str] = "Please be ready 10 minutes prior with student ID and resume copy."

class BulkStatusUpdateResponse(BaseModel):
    success: bool
    updated_count: int
    target_status: str
    message: str
