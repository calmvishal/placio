from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

DISCLAIMER_TEXT = (
    "Advisory Notice: AI analysis is purely consultative to assist with skill preparation. "
    "Placement shortlisting and eligibility decisions are strictly governed by institutional rules and company criteria."
)

class ResumeAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    identified_skills: List[str] = Field(default_factory=list, description="Skills detected in resume text")
    suggested_skills: List[str] = Field(default_factory=list, description="Recommended complementary skills")
    summary: str = Field(..., description="Overview summary of professional profile")
    improvement_tips: List[str] = Field(default_factory=list, description="Actionable tips to improve placement readiness")
    provider_used: str = Field("mock", description="AI engine provider used (gemini or mock)")
    is_advisory: bool = Field(True, description="Flag confirming advisory non-binding nature")
    disclaimer: str = Field(DISCLAIMER_TEXT, description="Institutional ethics disclaimer")

class JobMatchAnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: str
    company_name: str
    job_title: str
    match_score: int = Field(..., ge=0, le=100, description="Advisory skill alignment score from 0 to 100")
    matching_skills: List[str] = Field(default_factory=list, description="Student skills aligned with job requirements")
    missing_skills: List[str] = Field(default_factory=list, description="Required or preferred skills missing from profile")
    recommendations: List[str] = Field(default_factory=list, description="Actionable learning recommendations")
    project_ideas: List[str] = Field(default_factory=list, description="Relevant project topics to demonstrate missing skills")
    provider_used: str = Field("mock", description="AI engine provider used (gemini or mock)")
    is_advisory: bool = Field(True, description="Flag confirming advisory non-binding nature")
    disclaimer: str = Field(DISCLAIMER_TEXT, description="Institutional ethics disclaimer")
