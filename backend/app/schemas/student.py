from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime

class ProjectItem(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    description: str = Field(..., max_length=1000)
    tech_stack: List[str] = Field(default_factory=list)
    github_link: Optional[str] = None

class StudentProfileUpdateRequest(BaseModel):
    phone: Optional[str] = Field(None, max_length=20)
    department: Optional[str] = Field(None, max_length=50)
    branch: Optional[str] = Field(None, max_length=100)
    graduation_year: Optional[int] = Field(None, ge=2020, le=2035)
    
    # Academic Metrics
    tenth_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="10th grade percentage (0-100)")
    twelfth_percentage: Optional[float] = Field(None, ge=0.0, le=100.0, description="12th grade percentage (0-100)")
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0, description="Current CGPA on a 10-point scale")
    active_backlogs: Optional[int] = Field(None, ge=0, description="Number of currently active/standing backlogs")
    history_of_backlogs: Optional[int] = Field(None, ge=0, description="Total historical backlogs count")
    
    # Technical & Professional Information
    skills: Optional[List[str]] = Field(default_factory=list)
    programming_languages: Optional[List[str]] = Field(default_factory=list)
    projects: Optional[List[ProjectItem]] = Field(default_factory=list)
    certifications: Optional[List[str]] = Field(default_factory=list)
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None

class ResumeItem(BaseModel):
    id: str
    title: str = "Resume"
    filename: str
    original_name: str
    uploaded_at: datetime
    is_primary: bool = False
    extracted_characters: int = 0

class StudentProfileResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    roll_number: Optional[str] = None
    phone: Optional[str] = ""
    department: Optional[str] = "CSE"
    branch: Optional[str] = "Computer Science & Engineering"
    graduation_year: Optional[int] = 2026
    
    # Academic Records
    tenth_percentage: float = 0.0
    twelfth_percentage: float = 0.0
    cgpa: float = 0.0
    active_backlogs: int = 0
    history_of_backlogs: int = 0
    
    # Professional
    skills: List[str] = []
    programming_languages: List[str] = []
    projects: List[ProjectItem] = []
    certifications: List[str] = []
    github_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    
    # Resume
    resume_filename: Optional[str] = None
    resume_uploaded_at: Optional[datetime] = None
    has_resume: bool = False
    resumes: List[ResumeItem] = []
    
    # Calculated profile completion score (0-100%)
    completion_percentage: int = 0
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class StudentCreateByTpoRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., max_length=120)
    password: str = Field(..., min_length=6, max_length=100)
    roll_number: Optional[str] = Field(None, max_length=50)
    department: str = Field("CSE", max_length=50)
    branch: Optional[str] = Field("Computer Science & Engineering", max_length=100)
    graduation_year: int = Field(2026, ge=2020, le=2035)
    cgpa: Optional[float] = Field(0.0, ge=0.0, le=10.0)
    tenth_percentage: Optional[float] = Field(0.0, ge=0.0, le=100.0)
    twelfth_percentage: Optional[float] = Field(0.0, ge=0.0, le=100.0)
    phone: Optional[str] = Field("", max_length=20)

class StudentStatusUpdateRequest(BaseModel):
    is_active: bool
    reason: Optional[str] = ""

class StudentPasswordResetRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=100)

class StudentAdminListItem(BaseModel):
    id: str
    user_id: str
    full_name: str
    email: str
    roll_number: Optional[str] = None
    phone: Optional[str] = ""
    department: str
    branch: str
    graduation_year: int
    cgpa: float
    tenth_percentage: float = 0.0
    twelfth_percentage: float = 0.0
    active_backlogs: int
    is_active: bool
    is_verified: bool = True
    is_placed: bool = False
    placement_company: Optional[str] = None
    applications_count: int = 0
    has_resume: bool = False
    resume_filename: Optional[str] = None
    resumes_count: int = 0
    created_at: Optional[datetime] = None

class StudentVerificationUpdateRequest(BaseModel):
    is_verified: bool = Field(..., description="Approval and verification status")
