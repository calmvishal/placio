from datetime import datetime, timezone
from bson import ObjectId
from typing import List, Union, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, require_role
from app.db.mongodb import get_database
from app.schemas.job import (
    JobCreateRequest,
    JobUpdateRequest,
    JobResponse,
    StudentJobViewResponse,
    EligibilityCriterion,
)
from app.services.eligibility_service import evaluate_student_eligibility

router = APIRouter()

def serialize_job(job_doc: Dict[str, Any], applicants_count: int = 0) -> Dict[str, Any]:
    """Helper to convert MongoDB document to schema dictionary."""
    return {
        "id": str(job_doc["_id"]),
        "company_name": job_doc.get("company_name", ""),
        "title": job_doc.get("title", ""),
        "description": job_doc.get("description", ""),
        "job_type": job_doc.get("job_type", "Full-Time"),
        "required_branches": job_doc.get("required_branches", []),
        "min_cgpa": float(job_doc.get("min_cgpa", 0.0)),
        "graduation_year": int(job_doc.get("graduation_year", 2026)),
        "eligible_batches": [int(b) for b in job_doc.get("eligible_batches")] if job_doc.get("eligible_batches") else [int(job_doc.get("graduation_year", 2026))],
        "min_tenth_percentage": job_doc.get("min_tenth_percentage"),
        "min_twelfth_percentage": job_doc.get("min_twelfth_percentage"),
        "max_active_backlogs": int(job_doc.get("max_active_backlogs", 0)),
        "required_skills": job_doc.get("required_skills", []),
        "preferred_skills": job_doc.get("preferred_skills", []),
        "location": job_doc.get("location", ""),
        "work_mode": job_doc.get("work_mode", "On-site"),
        "salary_package": job_doc.get("salary_package", ""),
        "application_deadline": job_doc.get("application_deadline"),
        "recruitment_rounds": job_doc.get("recruitment_rounds", []),
        "interview_instructions": job_doc.get("interview_instructions", ""),
        "status": job_doc.get("status", "published"),
        "created_by": str(job_doc.get("created_by", "")),
        "applicants_count": applicants_count,
        "created_at": job_doc.get("created_at"),
        "updated_at": job_doc.get("updated_at"),
    }

@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new placement drive opportunity (TPO only)",
)
async def create_job(
    payload: JobCreateRequest,
    current_user: dict = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Create a new placement opportunity with deterministic eligibility rules.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    now = datetime.now(timezone.utc)
    job_doc = payload.model_dump()
    job_doc["created_by"] = ObjectId(current_user["id"])
    job_doc["created_at"] = now
    job_doc["updated_at"] = now

    result = await db["jobs"].insert_one(job_doc)
    job_doc["_id"] = result.inserted_id

    return JobResponse(**serialize_job(job_doc, applicants_count=0))

@router.get(
    "",
    response_model=Union[List[StudentJobViewResponse], List[JobResponse]],
    summary="List opportunities with personalized eligibility (Students) or full list (TPO)",
)
async def list_jobs(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    List opportunities.
    - Students receive published opportunities evaluated against their personal profile with explicit criteria reasons.
    - TPO Staff receive all opportunities (draft, published, closed) with applicant counts.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_role = current_user.get("role", "student")

    if user_role == "student":
        # 1. Fetch published jobs
        cursor = db["jobs"].find({"status": "published"}).sort("created_at", -1)
        jobs_list = await cursor.to_list(length=100)

        # 2. Fetch student's profile
        student_profile = await db["student_profiles"].find_one({"user_id": ObjectId(current_user["id"])})
        if not student_profile:
            student_profile = {
                "department": "CSE",
                "graduation_year": 2026,
                "cgpa": 0.0,
                "active_backlogs": 0,
            }

        # 3. Fetch student's existing applications
        existing_apps = await db["applications"].find(
            {"user_id": ObjectId(current_user["id"])},
            {"job_id": 1}
        ).to_list(length=100)
        applied_job_ids = {str(app["job_id"]) for app in existing_apps}

        # 4. Evaluate personalized eligibility for each opportunity
        results = []
        for job in jobs_list:
            job_id_str = str(job["_id"])
            already_applied = job_id_str in applied_job_ids

            evaluation = evaluate_student_eligibility(
                student_profile=student_profile,
                job=job,
                already_applied=already_applied,
            )

            job_dict = serialize_job(job)
            criteria_objects = [EligibilityCriterion(**c) for c in evaluation["criteria"]]

            results.append(StudentJobViewResponse(
                **job_dict,
                is_eligible=evaluation["is_eligible"],
                can_apply=evaluation["can_apply"],
                already_applied=evaluation["already_applied"],
                deadline_passed=evaluation["deadline_passed"],
                eligibility_criteria=criteria_objects,
            ))
        return results

    else:
        # TPO Admin / Staff view: list all opportunities with live applicant counts
        cursor = db["jobs"].find().sort("created_at", -1)
        jobs_list = await cursor.to_list(length=100)

        results = []
        for job in jobs_list:
            # Count applicants
            app_count = await db["applications"].count_documents({"job_id": job["_id"]})
            results.append(JobResponse(**serialize_job(job, applicants_count=app_count)))
        return results

@router.get(
    "/{job_id}",
    response_model=Union[StudentJobViewResponse, JobResponse],
    summary="Get detailed placement opportunity",
)
async def get_job_by_id(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Fetch a single placement opportunity by ID with personalized eligibility evaluation for students.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    job = await db["jobs"].find_one({"_id": obj_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job opportunity not found.")

    user_role = current_user.get("role", "student")

    if user_role == "student":
        student_profile = await db["student_profiles"].find_one({"user_id": ObjectId(current_user["id"])})
        if not student_profile:
            student_profile = {"department": "CSE", "graduation_year": 2026, "cgpa": 0.0, "active_backlogs": 0}

        app_exists = await db["applications"].find_one({
            "job_id": obj_id,
            "user_id": ObjectId(current_user["id"])
        })

        evaluation = evaluate_student_eligibility(
            student_profile=student_profile,
            job=job,
            already_applied=bool(app_exists),
        )

        job_dict = serialize_job(job)
        criteria_objects = [EligibilityCriterion(**c) for c in evaluation["criteria"]]

        return StudentJobViewResponse(
            **job_dict,
            is_eligible=evaluation["is_eligible"],
            can_apply=evaluation["can_apply"],
            already_applied=evaluation["already_applied"],
            deadline_passed=evaluation["deadline_passed"],
            eligibility_criteria=criteria_objects,
        )
    else:
        app_count = await db["applications"].count_documents({"job_id": obj_id})
        return JobResponse(**serialize_job(job, applicants_count=app_count))

@router.put(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update placement drive details or status (TPO only)",
)
async def update_job(
    job_id: str,
    payload: JobUpdateRequest,
    current_user: dict = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Update job criteria, application deadlines, or recruitment status.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    result = await db["jobs"].update_one({"_id": obj_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job opportunity not found.")

    updated_job = await db["jobs"].find_one({"_id": obj_id})
    app_count = await db["applications"].count_documents({"job_id": obj_id})
    return JobResponse(**serialize_job(updated_job, applicants_count=app_count))

@router.delete(
    "/{job_id}",
    summary="Delete or archive placement drive (TPO Admin only)",
)
async def delete_job(
    job_id: str,
    current_user: dict = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Permanently delete or archive a placement opportunity.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    result = await db["jobs"].delete_one({"_id": obj_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job opportunity not found.")

    return {"success": True, "message": "Job opportunity deleted successfully."}
