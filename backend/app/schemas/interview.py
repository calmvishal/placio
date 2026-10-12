from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class InterviewScheduleRequest(BaseModel):
    job_id: str = Field(..., description="Target placement drive identifier")
    student_ids: List[str] = Field(..., min_length=1, description="List of student user IDs to schedule")
    round_name: str = Field("Technical Round 1", min_length=2, max_length=100, description="Round name or description")
    scheduled_at: datetime = Field(..., description="Date and time of the interview")
    mode: str = Field("Online", description="Online or Offline")
    venue_or_link: str = Field(..., min_length=2, description="Meeting link or offline physical campus venue")
    instructions: Optional[str] = Field(None, max_length=1000, description="Specific instructions for candidate preparation")
    advance_stage: bool = Field(True, description="Automatically transition application status to 'Interview Scheduled'")

class InterviewOutcomeUpdateRequest(BaseModel):
    outcome: str = Field(..., description="One of: Pending, Cleared, Not Cleared, Absent, Rescheduled")
    outcome_notes: Optional[str] = Field(None, max_length=1000, description="Evaluation feedback or notes")
    update_application_status: Optional[str] = Field(None, description="Optional new application stage e.g. Selected, Rejected")

class InterviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    company_name: str
    job_title: str
    salary_package: str
    student_id: str
    student_name: str
    student_roll: str
    student_department: str
    round_name: str
    scheduled_at: datetime
    mode: str
    venue_or_link: str
    instructions: Optional[str] = None
    outcome: str = "Pending"
    outcome_notes: Optional[str] = None
    created_at: datetime
