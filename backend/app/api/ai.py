from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from bson import ObjectId
from app.db.mongodb import get_database
from app.api.deps import require_role
from app.schemas.ai import ResumeAnalysisResponse, JobMatchAnalysisResponse
from app.services.ai_service import analyze_resume_ai, evaluate_job_match_ai

router = APIRouter()

@router.post(
    "/resume/analyze",
    response_model=ResumeAnalysisResponse,
    summary="Advisory AI Resume Analysis & Skill Extraction",
    description="Parses student's uploaded resume text to identify skills, recommend missing competencies, and suggest profile improvements.",
)
async def analyze_student_resume(
    current_user: Dict[str, Any] = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Analyzes current student's resume and profile for advisory skill extraction and recommendations.
    """
    user_id = ObjectId(current_user["id"])
    profile = await db["student_profiles"].find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    resume_text = profile.get("resume_extracted_text") or ""
    current_skills = profile.get("skills") or []

    if not resume_text and not current_skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume PDF or enter technical skills in your profile before requesting AI analysis.",
        )

    analysis_result = await analyze_resume_ai(
        resume_text=resume_text,
        existing_skills=current_skills,
    )

    return ResumeAnalysisResponse(**analysis_result)

@router.get(
    "/job-match/{job_id}",
    response_model=JobMatchAnalysisResponse,
    summary="Advisory AI Job Fit & Skill Gap Analysis for Student",
    description="Evaluates student's technical background against a placement drive's requirements. Generates match percentage and skill-gap recommendations.",
)
async def get_job_match_advisory(
    job_id: str,
    resume_id: Optional[str] = Query(None, description="Optional specific resume ID from multiple resumes"),
    current_user: Dict[str, Any] = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Evaluates candidate job fit with transparent skill gap highlights.
    """
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid placement drive ID.")

    job = await db["jobs"].find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(status_code=404, detail="Placement opportunity not found.")

    user_id = ObjectId(current_user["id"])
    profile = await db["student_profiles"].find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    eval_profile = dict(profile)
    if resume_id:
        resumes = profile.get("resumes", [])
        matched = next((r for r in resumes if str(r.get("id")) == str(resume_id)), None)
        if matched:
            eval_profile["resume_extracted_text"] = matched.get("extracted_text", "")
            eval_profile["resume_filename"] = matched.get("filename")

    match_result = await evaluate_job_match_ai(student_profile=eval_profile, job=job)
    return JobMatchAnalysisResponse(**match_result)

@router.get(
    "/applicant-match/{application_id}",
    response_model=JobMatchAnalysisResponse,
    summary="Advisory AI Applicant Skill Match for TPO",
    description="Allows TPO coordinators to view AI-assisted skill overlap for a specific candidate application.",
)
async def get_applicant_match_advisory_tpo(
    application_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Provides TPO administrators with advisory candidate skill analysis.
    """
    if not ObjectId.is_valid(application_id):
        raise HTTPException(status_code=400, detail="Invalid application ID.")

    app = await db["applications"].find_one({"_id": ObjectId(application_id)})
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found.")

    job = await db["jobs"].find_one({"_id": app["job_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Associated placement drive not found.")

    # Use frozen snapshot or live profile
    student_snapshot = app.get("student_snapshot", {})
    match_result = await evaluate_job_match_ai(student_profile=student_snapshot, job=job)
    return JobMatchAnalysisResponse(**match_result)
