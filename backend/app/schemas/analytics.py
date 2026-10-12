from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FunnelStageMetric(BaseModel):
    stage: str
    count: int
    percentage: float = Field(0.0, description="Percentage of total applications")

class DepartmentPlacementMetric(BaseModel):
    department: str
    total_students: int
    placed_students: int
    placement_rate: float = Field(0.0, description="Department-specific placement percentage")

class TopRecruiterMetric(BaseModel):
    company_name: str
    drives_count: int
    applications_count: int
    offers_count: int

class PlacementOverviewResponse(BaseModel):
    total_students: int
    total_jobs: int
    active_jobs: int
    total_applications: int
    total_placed: int
    placement_rate_percent: float
    total_interviews: int
    
    # CTC Insights (in LPA)
    highest_ctc_lpa: float = 0.0
    average_ctc_lpa: float = 0.0
    median_ctc_lpa: float = 0.0

    # Analytics for Recharts visual graphs
    funnel: List[FunnelStageMetric]
    department_stats: List[DepartmentPlacementMetric]
    top_recruiters: List[TopRecruiterMetric]
    status_distribution: Dict[str, int]

class StudentAnalyticsResponse(BaseModel):
    total_applied: int
    under_review_count: int
    shortlisted_count: int
    assessment_count: int
    interview_scheduled_count: int
    selected_count: int
    rejected_count: int
    withdrawn_count: int
    upcoming_interviews_count: int
    profile_completion: int
    funnel_breakdown: List[FunnelStageMetric]
