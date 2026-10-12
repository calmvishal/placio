import re
import statistics
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user, require_role
from app.db.mongodb import get_database
from app.schemas.analytics import (
    PlacementOverviewResponse,
    StudentAnalyticsResponse,
    FunnelStageMetric,
    DepartmentPlacementMetric,
    TopRecruiterMetric,
)

router = APIRouter()

ALLOWED_STAGES = [
    "Applied",
    "Under Review",
    "Shortlisted",
    "Assessment",
    "Interview Scheduled",
    "Selected",
    "Rejected",
    "Withdrawn",
]

def parse_ctc_in_lpa(val: Optional[str]) -> Optional[float]:
    """
    Safely parses salary string (e.g. '12 LPA', '8.5 LPA', '₹10,00,000', '1400000', '6-10 LPA')
    into a numeric float in Lakhs Per Annum (LPA).
    Returns None if unparseable or purely descriptive.
    """
    if not val:
        return None
    val_clean = str(val).lower().replace(",", "").replace("₹", "").strip()
    
    # 1. Matches range like "8 - 12 lpa" -> takes the upper bound (12.0)
    range_match = re.search(r"(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh)?", val_clean)
    if range_match and ("lpa" in val_clean or "lac" in val_clean or "lakh" in val_clean):
        try:
            return round(float(range_match.group(2)), 2)
        except Exception:
            pass
            
    # 2. Matches single explicit "12.5 lpa"
    lpa_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lpa|lac|lakh)", val_clean)
    if lpa_match:
        try:
            return round(float(lpa_match.group(1)), 2)
        except Exception:
            pass
            
    # 3. Numeric matches e.g. 1000000 (10 Lakhs)
    nums = re.findall(r"\b\d+(?:\.\d+)?\b", val_clean)
    for num_str in nums:
        try:
            n = float(num_str)
            if n >= 100000:
                return round(n / 100000, 2)
            elif 1.0 <= n <= 100.0:
                return round(n, 2)
        except Exception:
            continue
            
    return None

@router.get("/overview", response_model=PlacementOverviewResponse)
async def get_placement_overview(
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db=Depends(get_database)
):
    """
    Comprehensive Placement Cell Analytics endpoint for TPO Administrators.
    Returns:
    - Overall placement counts & placement rate (%)
    - Active vs total drives
    - Genuine CTC metrics (highest, average, median in LPA)
    - Full recruitment funnel metrics
    - Branch/Department-wise placement breakdown
    - Top recruiting companies
    - Application status distribution for graphical Recharts components
    """
    # 1. Total Registered Students
    total_students = await db.users.count_documents({"role": "student"})
    
    # 2. Total Drives & Active Drives
    total_jobs = await db.jobs.count_documents({})
    active_jobs = await db.jobs.count_documents({"status": "published"})
    
    # 3. Total Applications & Interviews
    total_applications = await db.applications.count_documents({})
    total_interviews = await db.interviews.count_documents({})
    
    # 4. Placed Students (Distinct students whose application reached 'Selected')
    selected_apps = await db.applications.find({"status": "Selected"}).to_list(2000)
    placed_student_ids = {str(app.get("student_id")) for app in selected_apps if app.get("student_id")}
    placed_user_ids = {str(app.get("user_id")) for app in selected_apps if app.get("user_id")}
    # Combined distinct set of placed students
    distinct_placed_count = len(placed_student_ids.union(placed_user_ids))
    
    placement_rate_percent = (
        round((distinct_placed_count / total_students * 100), 1) if total_students > 0 else 0.0
    )
    
    # 5. Calculate CTC Metrics (in LPA)
    # Collect CTC from placed applications; if none placed yet, use posted jobs
    ctc_values: List[float] = []
    for app in selected_apps:
        ctc = parse_ctc_in_lpa(app.get("salary_package"))
        if ctc is not None and ctc > 0:
            ctc_values.append(ctc)
            
    if not ctc_values:
        # Fallback to published jobs so metrics reflect offerings
        all_jobs = await db.jobs.find({}).to_list(500)
        for job in all_jobs:
            ctc = parse_ctc_in_lpa(job.get("salary_package"))
            if ctc is not None and ctc > 0:
                ctc_values.append(ctc)
                
    highest_ctc_lpa = max(ctc_values) if ctc_values else 0.0
    average_ctc_lpa = round(sum(ctc_values) / len(ctc_values), 2) if ctc_values else 0.0
    median_ctc_lpa = round(statistics.median(ctc_values), 2) if ctc_values else 0.0

    # 6. Recruitment Funnel Pipeline & Status Distribution
    status_distribution: Dict[str, int] = {}
    funnel: List[FunnelStageMetric] = []
    
    for stage in ALLOWED_STAGES:
        count = await db.applications.count_documents({"status": stage})
        status_distribution[stage] = count
        pct = round((count / total_applications * 100), 1) if total_applications > 0 else 0.0
        funnel.append(FunnelStageMetric(stage=stage, count=count, percentage=pct))

    # 7. Department-wise Placement Statistics
    # Standard departments to always present cleanly
    standard_departments = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS"]
    dept_totals: Dict[str, int] = {d: 0 for d in standard_departments}
    dept_placed: Dict[str, int] = {d: 0 for d in standard_departments}

    # Fetch all student profiles
    profiles = await db.student_profiles.find({}).to_list(3000)
    for p in profiles:
        raw_dept = (p.get("department") or "CSE").strip().upper()
        # Normalize common department abbreviations
        if "COMPUTER" in raw_dept or "CSE" in raw_dept:
            dept = "CSE"
        elif "INFO" in raw_dept or "IT" in raw_dept:
            dept = "IT"
        elif "ELECTRO" in raw_dept or "ECE" in raw_dept:
            dept = "ECE"
        elif "ELECTRI" in raw_dept or "EEE" in raw_dept:
            dept = "EEE"
        elif "MECH" in raw_dept:
            dept = "MECH"
        elif "CIVIL" in raw_dept:
            dept = "CIVIL"
        elif "AI" in raw_dept or "DATA" in raw_dept or "AIDS" in raw_dept:
            dept = "AIDS"
        else:
            dept = raw_dept[:10]

        dept_totals[dept] = dept_totals.get(dept, 0) + 1
        
        # Check if student was placed
        pid = str(p.get("_id"))
        uid = str(p.get("user_id"))
        if pid in placed_student_ids or uid in placed_user_ids:
            dept_placed[dept] = dept_placed.get(dept, 0) + 1

    department_stats: List[DepartmentPlacementMetric] = []
    # Include non-empty departments or standard ones
    for dept, total_in_dept in dept_totals.items():
        placed_in_dept = dept_placed.get(dept, 0)
        rate = round((placed_in_dept / total_in_dept * 100), 1) if total_in_dept > 0 else 0.0
        # Only include if department has students or is among top standard departments
        if total_in_dept > 0 or dept in ["CSE", "IT", "ECE"]:
            department_stats.append(
                DepartmentPlacementMetric(
                    department=dept,
                    total_students=total_in_dept,
                    placed_students=placed_in_dept,
                    placement_rate=rate
                )
            )

    # 8. Top Recruiter Companies
    all_apps = await db.applications.find({}, {"company_name": 1, "status": 1}).to_list(3000)
    company_stats: Dict[str, Dict[str, int]] = {}
    for app in all_apps:
        comp = app.get("company_name", "Unknown").strip()
        if comp not in company_stats:
            company_stats[comp] = {"applications": 0, "offers": 0}
        company_stats[comp]["applications"] += 1
        if app.get("status") == "Selected":
            company_stats[comp]["offers"] += 1

    # Get drive counts for companies
    all_jobs_records = await db.jobs.find({}, {"company_name": 1}).to_list(1000)
    company_drives: Dict[str, int] = {}
    for j in all_jobs_records:
        comp = j.get("company_name", "Unknown").strip()
        company_drives[comp] = company_drives.get(comp, 0) + 1

    top_recruiters: List[TopRecruiterMetric] = []
    for comp, stats in company_stats.items():
        top_recruiters.append(
            TopRecruiterMetric(
                company_name=comp,
                drives_count=company_drives.get(comp, 1),
                applications_count=stats["applications"],
                offers_count=stats["offers"]
            )
        )
    # Sort top recruiters by offers desc, then applications desc
    top_recruiters.sort(key=lambda x: (x.offers_count, x.applications_count), reverse=True)
    top_recruiters = top_recruiters[:6]

    return PlacementOverviewResponse(
        total_students=total_students,
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        total_applications=total_applications,
        total_placed=distinct_placed_count,
        placement_rate_percent=placement_rate_percent,
        total_interviews=total_interviews,
        highest_ctc_lpa=highest_ctc_lpa,
        average_ctc_lpa=average_ctc_lpa,
        median_ctc_lpa=median_ctc_lpa,
        funnel=funnel,
        department_stats=department_stats,
        top_recruiters=top_recruiters,
        status_distribution=status_distribution
    )

@router.get("/student-summary", response_model=StudentAnalyticsResponse)
async def get_student_analytics_summary(
    current_user: Dict[str, Any] = Depends(require_role(["student"])),
    db=Depends(get_database)
):
    """
    Personal placement analytics and recruitment funnel for the authenticated student.
    """
    user_id_str = str(current_user.get("id") or current_user.get("_id"))
    raw_user_id = current_user.get("_id")
    try:
        user_obj_id = ObjectId(user_id_str) if ObjectId.is_valid(user_id_str) else raw_user_id
    except Exception:
        user_obj_id = raw_user_id
    
    # 1. Student profile
    profile = await db.student_profiles.find_one({"$or": [{"user_id": user_obj_id}, {"user_id": user_id_str}]})
    profile_completion = profile.get("completion_percentage", 0) if profile else 0
    student_id_str = str(profile.get("_id")) if profile else ""
    student_obj_id = profile.get("_id") if profile else None

    # 2. Student applications matching user_id or student_id as either String or ObjectId
    app_filters = [{"user_id": user_id_str}]
    if user_obj_id:
        app_filters.append({"user_id": user_obj_id})
    if student_id_str:
        app_filters.append({"student_id": student_id_str})
    if student_obj_id:
        app_filters.append({"student_id": student_obj_id})

    apps = await db.applications.find({"$or": app_filters}).to_list(500)
    
    counts: Dict[str, int] = {stage: 0 for stage in ALLOWED_STAGES}
    for app in apps:
        st = app.get("status", "Applied")
        if st in counts:
            counts[st] += 1
            
    total_applied = len(apps)
    
    # 3. Funnel breakdown
    funnel: List[FunnelStageMetric] = []
    for stage in ALLOWED_STAGES:
        cnt = counts.get(stage, 0)
        pct = round((cnt / total_applied * 100), 1) if total_applied > 0 else 0.0
        funnel.append(FunnelStageMetric(stage=stage, count=cnt, percentage=pct))
        
    # 4. Upcoming scheduled interviews
    interview_filters = [
        {"student_email": current_user.get("email")},
        {"user_id": user_id_str},
        {"student_id": user_id_str},
    ]
    if user_obj_id:
        interview_filters.extend([{"user_id": user_obj_id}, {"student_id": user_obj_id}])
    if student_id_str:
        interview_filters.extend([{"student_id": student_id_str}, {"user_id": student_id_str}])
    if student_obj_id:
        interview_filters.append({"student_id": student_obj_id})

    interview_query = {
        "$and": [
            {"$or": interview_filters},
            {
                "$or": [
                    {"outcome": "Pending"},
                    {"outcome": None},
                    {"outcome": {"$exists": False}},
                    {"status": "scheduled"},
                ]
            },
        ]
    }
    upcoming_interviews_count = await db.interviews.count_documents(interview_query)

    return StudentAnalyticsResponse(
        total_applied=total_applied,
        under_review_count=counts.get("Under Review", 0),
        shortlisted_count=counts.get("Shortlisted", 0),
        assessment_count=counts.get("Assessment", 0),
        interview_scheduled_count=counts.get("Interview Scheduled", 0),
        selected_count=counts.get("Selected", 0),
        rejected_count=counts.get("Rejected", 0),
        withdrawn_count=counts.get("Withdrawn", 0),
        upcoming_interviews_count=upcoming_interviews_count,
        profile_completion=profile_completion,
        funnel_breakdown=funnel
    )
