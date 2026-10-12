from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime, timezone, timedelta

class JobCreateRequest(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=150, description="Company Name")
    title: str = Field(..., min_length=2, max_length=150, description="Job Role Title")
    description: str = Field("Recruitment drive opportunity", min_length=2, description="Job Description")
    job_type: str = Field("Full-Time", description="Full-Time | Internship | Internship+PPO")
    
    # Eligibility Criteria
    required_branches: List[str] = Field(default_factory=lambda: ["CSE", "IT"])
    min_cgpa: float = Field(0.0, ge=0.0, le=10.0, description="Minimum CGPA required (0.0 to 10.0)")
    graduation_year: Optional[int] = Field(2026, ge=2020, le=2035, description="Primary eligible graduation batch")
    eligible_batches: Optional[List[int]] = Field(default_factory=lambda: [2026], description="List of eligible passing batch years (e.g. [2025, 2026])")
    min_tenth_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    min_twelfth_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    max_active_backlogs: int = Field(0, ge=0, description="Maximum allowed standing active backlogs")
    
    # Skills
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    
    # Compensation & Logistics
    location: str = Field("Bangalore, India")
    work_mode: str = Field("On-site", description="On-site | Hybrid | Remote")
    salary_package: str = Field("As per company standard", description="Salary package or CTC")
    application_deadline: Optional[datetime] = None
    recruitment_rounds: List[str] = Field(default_factory=lambda: ["Online Assessment", "Technical Interview", "HR Round"])
    interview_instructions: Optional[str] = ""
    status: str = Field("published", description="draft | published | closed | archived")

    @field_validator("application_deadline", mode="before")
    @classmethod
    def validate_deadline(cls, v):
        if not v:
            # Fallback to 14 days from now if empty
            return datetime.now(timezone.utc) + timedelta(days=14)
        if isinstance(v, str):
            try:
                # Handle standard ISO strings
                return datetime.fromisoformat(v.replace("Z", "+00:00"))
            except Exception:
                return datetime.now(timezone.utc) + timedelta(days=14)
        return v

class JobUpdateRequest(BaseModel):
    company_name: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    job_type: Optional[str] = None
    required_branches: Optional[List[str]] = None
    min_cgpa: Optional[float] = None
    graduation_year: Optional[int] = None
    eligible_batches: Optional[List[int]] = None
    min_tenth_percentage: Optional[float] = None
    min_twelfth_percentage: Optional[float] = None
    max_active_backlogs: Optional[int] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    location: Optional[str] = None
    work_mode: Optional[str] = None
    salary_package: Optional[str] = None
    application_deadline: Optional[datetime] = None
    recruitment_rounds: Optional[List[str]] = None
    interview_instructions: Optional[str] = None
    status: Optional[str] = None

class JobResponse(BaseModel):
    id: str
    company_name: str
    title: str
    description: str
    job_type: str
    required_branches: List[str]
    min_cgpa: float
    graduation_year: int
    eligible_batches: List[int] = [2026]
    min_tenth_percentage: Optional[float] = None
    min_twelfth_percentage: Optional[float] = None
    max_active_backlogs: int
    required_skills: List[str]
    preferred_skills: List[str]
    location: str
    work_mode: str
    salary_package: str
    application_deadline: datetime
    recruitment_rounds: List[str]
    interview_instructions: Optional[str] = ""
    status: str
    created_by: str
    applicants_count: int = 0
    created_at: datetime
    updated_at: datetime

class EligibilityCriterion(BaseModel):
    rule: str
    passed: bool
    student_value: str
    required_value: str
    message: str

class StudentJobViewResponse(JobResponse):
    is_eligible: bool
    can_apply: bool
    already_applied: bool
    deadline_passed: bool
    eligibility_criteria: List[EligibilityCriterion]
