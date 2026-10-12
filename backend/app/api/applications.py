from datetime import datetime, timezone, timedelta
from bson import ObjectId
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks

IST = timezone(timedelta(hours=5, minutes=30))

from app.api.deps import get_current_user, require_role
from app.db.mongodb import get_database
from app.schemas.application import (
    ApplicationCreateRequest,
    ApplicationStatusUpdateRequest,
    BulkApplicationStatusUpdateRequest,
    BulkStatusUpdateResponse,
    ApplicationResponse,
    StudentSnapshot,
    StatusHistoryItem,
    ALLOWED_STATUSES,
)
from app.services.eligibility_service import evaluate_student_eligibility
from app.services.email_service import send_status_update_email, send_interview_scheduled_email

router = APIRouter()

def serialize_application(
    app_doc: Dict[str, Any],
    job_doc: Optional[Dict[str, Any]] = None,
    interview_doc: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Helper to format MongoDB application document to response dictionary."""
    snapshot = app_doc.get("student_snapshot", {})
    history = app_doc.get("status_history", [])
    
    company = job_doc.get("company_name", "") if job_doc else app_doc.get("company_name", "")
    title = job_doc.get("title", "") if job_doc else app_doc.get("job_title", "")
    salary = job_doc.get("salary_package", "") if job_doc else app_doc.get("salary_package", "")

    interview_details = None
    if interview_doc:
        sched = interview_doc.get("scheduled_at")
        if isinstance(sched, datetime) and sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
        interview_details = {
            "id": str(interview_doc.get("_id", "")),
            "round_name": interview_doc.get("round_name", "Technical Round 1"),
            "scheduled_at": sched,
            "mode": interview_doc.get("mode", "Online"),
            "venue_or_link": interview_doc.get("venue_or_link", ""),
            "instructions": interview_doc.get("instructions"),
            "outcome": interview_doc.get("outcome", "Pending"),
        }
    elif app_doc.get("interview_details"):
        interview_details = app_doc.get("interview_details")

    return {
        "id": str(app_doc["_id"]),
        "job_id": str(app_doc["job_id"]),
        "company_name": company,
        "job_title": title,
        "salary_package": salary,
        "student_id": str(app_doc.get("student_id", "")),
        "user_id": str(app_doc.get("user_id", "")),
        "status": app_doc.get("status", "Applied"),
        "student_snapshot": StudentSnapshot(**snapshot),
        "status_history": [StatusHistoryItem(**h) for h in history],
        "applied_at": app_doc.get("applied_at"),
        "updated_at": app_doc.get("updated_at"),
        "interview_details": interview_details,
    }

@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for a placement drive (Student only)",
)
async def apply_for_job(
    payload: ApplicationCreateRequest,
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Submit application for a published placement drive.
    Validates server-side eligibility, deadline, and duplicates, then freezes profile snapshot.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        job_obj_id = ObjectId(payload.job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    # 1. Verify Job exists and is published
    job = await db["jobs"].find_one({"_id": job_obj_id})
    if not job:
        raise HTTPException(status_code=404, detail="Placement opportunity not found.")

    if job.get("status") != "published":
        raise HTTPException(
            status_code=400,
            detail=f"This placement drive is currently {job.get('status')} and not accepting applications.",
        )

    # 2. Verify Deadline
    deadline = job.get("application_deadline")
    now = datetime.now(timezone.utc)
    if isinstance(deadline, datetime):
        deadline_tz = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
        if now > deadline_tz:
            raise HTTPException(status_code=400, detail="The application deadline for this drive has expired.")

    user_obj_id = ObjectId(current_user["id"])

    # 3. Check for Duplicate Application
    existing_app = await db["applications"].find_one({
        "job_id": job_obj_id,
        "user_id": user_obj_id,
    })
    if existing_app:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted an application for this placement opportunity.",
        )

    # 4. Fetch Student Profile and Verify Eligibility
    student_profile = await db["student_profiles"].find_one({"user_id": user_obj_id})
    if not student_profile:
        raise HTTPException(status_code=400, detail="Please complete your student profile before applying.")

    evaluation = evaluate_student_eligibility(
        student_profile=student_profile,
        job=job,
        already_applied=False,
    )

    if not evaluation["is_eligible"]:
        # Find failed criteria to give clear feedback
        failed_reasons = [c["message"] for c in evaluation["criteria"] if not c["passed"]]
        raise HTTPException(
            status_code=400,
            detail=f"Eligibility criteria not satisfied: {'; '.join(failed_reasons)}",
        )

    # 5. Build Immutable Student Snapshot
    chosen_resume_filename = student_profile.get("resume_filename")
    if payload.resume_id:
        resumes = student_profile.get("resumes", [])
        matched = next((r for r in resumes if str(r.get("id")) == str(payload.resume_id)), None)
        if matched and matched.get("filename"):
            chosen_resume_filename = matched["filename"]

    student_snapshot = {
        "full_name": current_user.get("full_name", ""),
        "email": current_user.get("email", ""),
        "roll_number": student_profile.get("roll_number"),
        "department": student_profile.get("department", "CSE"),
        "branch": student_profile.get("branch", "Computer Science & Engineering"),
        "graduation_year": student_profile.get("graduation_year", 2026),
        "tenth_percentage": float(student_profile.get("tenth_percentage", 0.0)),
        "twelfth_percentage": float(student_profile.get("twelfth_percentage", 0.0)),
        "cgpa": float(student_profile.get("cgpa", 0.0)),
        "active_backlogs": int(student_profile.get("active_backlogs", 0)),
        "skills": student_profile.get("skills", []),
        "resume_filename": chosen_resume_filename,
    }

    initial_history_item = {
        "status": "Applied",
        "updated_by": str(user_obj_id),
        "updated_at": now,
        "notes": "Application successfully submitted by student.",
    }

    # 6. Insert Application Record
    app_doc = {
        "job_id": job_obj_id,
        "student_id": student_profile["_id"],
        "user_id": user_obj_id,
        "company_name": job.get("company_name", ""),
        "job_title": job.get("title", ""),
        "salary_package": job.get("salary_package", ""),
        "status": "Applied",
        "student_snapshot": student_snapshot,
        "status_history": [initial_history_item],
        "applied_at": now,
        "updated_at": now,
    }

    result = await db["applications"].insert_one(app_doc)
    app_doc["_id"] = result.inserted_id

    # 7. Create In-App Notification
    await db["notifications"].insert_one({
        "user_id": user_obj_id,
        "title": "Application Submitted",
        "message": f"Your application for {job.get('company_name')} ({job.get('title')}) has been submitted.",
        "type": "application_status",
        "read": False,
        "created_at": now,
    })

    return ApplicationResponse(**serialize_application(app_doc, job_doc=job))

@router.get(
    "/my",
    response_model=List[ApplicationResponse],
    summary="Get all applications submitted by current student",
)
async def get_my_applications(
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Fetch all placement applications for the authenticated student.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_obj_id = ObjectId(current_user["id"])
    cursor = db["applications"].find({"user_id": user_obj_id}).sort("applied_at", -1)
    apps = await cursor.to_list(length=100)

    results = []
    for a in apps:
        job = await db["jobs"].find_one({"_id": a["job_id"]})
        # Check if an interview schedule exists for this candidate and drive
        interview = await db["interviews"].find_one(
            {
                "job_id": a["job_id"],
                "$or": [
                    {"student_id": user_obj_id},
                    {"student_id": a.get("student_id")},
                    {"student_id": str(user_obj_id)},
                ],
            },
            sort=[("scheduled_at", -1)],
        )
        results.append(ApplicationResponse(**serialize_application(a, job_doc=job, interview_doc=interview)))
    return results

@router.get(
    "/job/{job_id}",
    response_model=List[ApplicationResponse],
    summary="Get applicants for a specific placement drive (TPO only)",
)
async def get_job_applicants(
    job_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    branch_filter: Optional[str] = Query(None, alias="branch"),
    min_cgpa: Optional[float] = Query(None, alias="min_cgpa"),
    current_user: dict = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    List applicants for a specific placement drive with filtering by stage, branch, or CGPA.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        job_obj_id = ObjectId(job_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    query: Dict[str, Any] = {"job_id": job_obj_id}

    if status_filter:
        query["status"] = status_filter
    if branch_filter:
        query["student_snapshot.department"] = branch_filter.upper()
    if min_cgpa is not None:
        query["student_snapshot.cgpa"] = {"$gte": min_cgpa}

    cursor = db["applications"].find(query).sort("applied_at", -1)
    apps = await cursor.to_list(length=500)

    job = await db["jobs"].find_one({"_id": job_obj_id})

    results = []
    for a in apps:
        sid = a.get("student_id")
        uid = a.get("user_id")
        id_queries = []
        if sid:
            id_queries.extend([{"student_id": sid}, {"student_id": str(sid)}])
        if uid:
            id_queries.extend([{"student_id": uid}, {"student_id": str(uid)}])

        interview = None
        if id_queries:
            interview = await db["interviews"].find_one(
                {"job_id": job_obj_id, "$or": id_queries},
                sort=[("scheduled_at", -1)],
            )
        results.append(ApplicationResponse(**serialize_application(a, job_doc=job, interview_doc=interview)))
    return results

@router.post(
    "/bulk-status",
    response_model=BulkStatusUpdateResponse,
    summary="Bulk update recruitment stage for multiple drive applicants (TPO only)",
)
async def bulk_update_applicant_statuses(
    payload: BulkApplicationStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Transition multiple applicants simultaneously to a target stage.
    Appends to each candidate's timeline, optionally creates interview sessions,
    and dispatches status update notifications.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed statuses: {', '.join(ALLOWED_STATUSES)}",
        )

    valid_oids = []
    for aid in payload.application_ids:
        try:
            valid_oids.append(ObjectId(aid))
        except Exception:
            pass

    if not valid_oids:
        raise HTTPException(status_code=400, detail="No valid application IDs provided.")

    cursor = db["applications"].find({"_id": {"$in": valid_oids}})
    applications = await cursor.to_list(length=1000)

    if not applications:
        raise HTTPException(status_code=404, detail="No matching applications found.")

    now = datetime.now(timezone.utc)
    note_text = payload.notes.strip() if payload.notes else f"Bulk transition to {payload.status}."

    sched_dt = None
    interview_time_str = None
    if payload.status == "Interview Scheduled" and payload.interview_date:
        sched_dt = payload.interview_date
        if sched_dt.tzinfo is None:
            sched_dt = sched_dt.replace(tzinfo=timezone.utc)
        local_sched = sched_dt.astimezone(IST)
        interview_time_str = local_sched.strftime("%d-%b-%Y at %I:%M %p")
        note_text = (
            f"{payload.interview_round} scheduled ({payload.interview_mode}) on {interview_time_str}. "
            f"Link/Venue: {payload.interview_venue_or_link}. {payload.notes or ''}".strip()
        )

    updated_count = 0
    job_cache: Dict[str, Any] = {}

    for app in applications:
        app_id = app["_id"]
        job_id = app.get("job_id")
        user_id = app.get("user_id")

        if str(job_id) not in job_cache:
            j_doc = await db["jobs"].find_one({"_id": job_id})
            job_cache[str(job_id)] = j_doc
        job = job_cache[str(job_id)]
        company_name = job.get("company_name", "Placement Drive") if job else "Placement Drive"
        job_title = job.get("title", "Position") if job else "Position"

        history_entry = {
            "status": payload.status,
            "updated_by": current_user.get("full_name", "TPO Cell"),
            "updated_at": now,
            "notes": note_text,
        }

        update_fields: Dict[str, Any] = {
            "status": payload.status,
            "updated_at": now,
        }

        # If scheduling interview
        if payload.status == "Interview Scheduled" and payload.interview_date and sched_dt:
            interview_doc = {
                "job_id": job_id,
                "student_id": user_id,
                "application_id": app_id,
                "round_name": (payload.interview_round or "Technical Round 1").strip(),
                "scheduled_at": sched_dt,
                "mode": payload.interview_mode or "Online",
                "venue_or_link": (payload.interview_venue_or_link or "").strip(),
                "instructions": (payload.interview_instructions or "").strip() if payload.interview_instructions else None,
                "outcome": "Pending",
                "outcome_notes": None,
                "created_at": now,
                "updated_at": now,
            }
            await db["interviews"].insert_one(interview_doc)

            student_user = await db["users"].find_one({"_id": user_id})
            if student_user and student_user.get("email"):
                background_tasks.add_task(
                    send_interview_scheduled_email,
                    to_email=student_user["email"],
                    student_name=student_user.get("full_name", "Student"),
                    company_name=company_name,
                    job_title=job_title,
                    round_name=interview_doc["round_name"],
                    scheduled_at=sched_dt,
                    mode=interview_doc["mode"],
                    venue_or_link=interview_doc["venue_or_link"],
                    instructions=interview_doc.get("instructions"),
                )
        else:
            student_user = await db["users"].find_one({"_id": user_id})
            if student_user and student_user.get("email"):
                background_tasks.add_task(
                    send_status_update_email,
                    to_email=student_user["email"],
                    student_name=student_user.get("full_name", "Student"),
                    company_name=company_name,
                    job_title=job_title,
                    new_status=payload.status,
                    notes=note_text,
                )

        notif_doc = {
            "user_id": user_id,
            "title": f"Application Update: {company_name}",
            "message": f"Your application status for {company_name} - {job_title} has progressed to '{payload.status}'.",
            "type": "application_status",
            "read": False,
            "created_at": now,
        }
        await db["notifications"].insert_one(notif_doc)

        await db["applications"].update_one(
            {"_id": app_id},
            {
                "$set": update_fields,
                "$push": {"status_history": history_entry},
            }
        )
        updated_count += 1

    return BulkStatusUpdateResponse(
        success=True,
        updated_count=updated_count,
        target_status=payload.status,
        message=f"Successfully transitioned {updated_count} applicants to '{payload.status}'.",
    )

@router.put(
    "/{application_id}/status",
    response_model=ApplicationResponse,
    summary="Update applicant recruitment stage (TPO only)",
)
async def update_application_status(
    application_id: str,
    payload: ApplicationStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Transition applicant to a new recruitment stage (e.g. Shortlisted, Interview Scheduled, Selected).
    Appends to status history, creates interview record if scheduled, and dispatches email & in-app notifications.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        app_obj_id = ObjectId(application_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID format.")

    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed statuses: {', '.join(ALLOWED_STATUSES)}",
        )

    app = await db["applications"].find_one({"_id": app_obj_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application record not found.")

    now = datetime.now(timezone.utc)
    job = await db["jobs"].find_one({"_id": app["job_id"]})
    company_name = job.get("company_name", "the placement drive") if job else "the placement drive"
    job_title = job.get("title", "Position") if job else "Position"

    # Fetch candidate user record for name & email
    student_user = await db["users"].find_one({"_id": app["user_id"]})
    candidate_email = (
        student_user.get("email") if student_user else app.get("student_snapshot", {}).get("email")
    )
    candidate_name = (
        student_user.get("full_name") if student_user else app.get("student_snapshot", {}).get("full_name", "Student")
    )

    created_interview_doc = None
    note_text = payload.notes.strip() if payload.notes else f"Stage updated to {payload.status} by placement cell."

    # If transitioning to Interview Scheduled with interview date/time provided
    if payload.status == "Interview Scheduled" and payload.interview_date:
        sched_dt = payload.interview_date
        if sched_dt.tzinfo is None:
            sched_dt = sched_dt.replace(tzinfo=timezone.utc)
        local_sched = sched_dt.astimezone(IST)
        date_formatted = local_sched.strftime("%d-%b-%Y at %I:%M %p")
        note_text = (
            f"{payload.interview_round} scheduled ({payload.interview_mode}) on {date_formatted}. "
            f"Venue/Link: {payload.interview_venue_or_link}. {payload.notes or ''}".strip()
        )

        interview_data = {
            "job_id": app["job_id"],
            "student_id": app["user_id"],
            "application_id": app_obj_id,
            "round_name": (payload.interview_round or "Technical Round 1").strip(),
            "scheduled_at": sched_dt,
            "mode": payload.interview_mode or "Online",
            "venue_or_link": (payload.interview_venue_or_link or "").strip(),
            "instructions": (payload.interview_instructions or "").strip() if payload.interview_instructions else None,
            "outcome": "Pending",
            "outcome_notes": None,
            "created_by": ObjectId(current_user["id"]),
            "created_at": now,
            "updated_at": now,
        }
        int_res = await db["interviews"].insert_one(interview_data)
        interview_data["_id"] = int_res.inserted_id
        created_interview_doc = interview_data

        # Dispatch interview scheduled email in background
        if candidate_email:
            background_tasks.add_task(
                send_interview_scheduled_email,
                to_email=candidate_email,
                student_name=candidate_name,
                company_name=company_name,
                job_title=job_title,
                round_name=payload.interview_round or "Technical Round 1",
                scheduled_at=payload.interview_date,
                mode=payload.interview_mode or "Online",
                venue_or_link=payload.interview_venue_or_link or "",
                instructions=payload.interview_instructions,
            )
    else:
        # Standard status transition email dispatch in background
        if candidate_email:
            background_tasks.add_task(
                send_status_update_email,
                to_email=candidate_email,
                student_name=candidate_name,
                company_name=company_name,
                job_title=job_title,
                new_status=payload.status,
                notes=payload.notes,
            )

    history_entry = {
        "status": payload.status,
        "updated_by": str(current_user["id"]),
        "updated_at": now,
        "notes": note_text,
    }

    await db["applications"].update_one(
        {"_id": app_obj_id},
        {
            "$set": {
                "status": payload.status,
                "updated_at": now,
            },
            "$push": {
                "status_history": history_entry,
            },
        },
    )

    # In-App Notification for Student
    notif_title = (
        f"Interview Scheduled: {payload.interview_round}"
        if payload.status == "Interview Scheduled"
        else f"Application Status: {payload.status}"
    )
    notif_msg = (
        f"Interview scheduled for {company_name} on {payload.interview_date.strftime('%d-%b-%Y at %I:%M %p')}."
        if (payload.status == "Interview Scheduled" and payload.interview_date)
        else f"Your application for {company_name} has moved to '{payload.status}'."
    )

    await db["notifications"].insert_one({
        "user_id": app["user_id"],
        "title": notif_title,
        "message": notif_msg,
        "type": "interview_scheduled" if payload.status == "Interview Scheduled" else "application_status",
        "link": "/student/interviews" if payload.status == "Interview Scheduled" else "/student/applications",
        "read": False,
        "created_at": now,
    })

    # Audit Log
    await db["audit_logs"].insert_one({
        "user_id": ObjectId(current_user["id"]),
        "action": "UPDATE_APPLICATION_STATUS",
        "entity_type": "application",
        "entity_id": str(app_obj_id),
        "details": {
            "old_status": app.get("status"),
            "new_status": payload.status,
            "notes": payload.notes,
        },
        "timestamp": now,
    })

    updated_app = await db["applications"].find_one({"_id": app_obj_id})
    return ApplicationResponse(**serialize_application(updated_app, job_doc=job, interview_doc=created_interview_doc))

@router.post(
    "/{application_id}/withdraw",
    response_model=ApplicationResponse,
    summary="Withdraw application (Student only)",
)
async def withdraw_application(
    application_id: str,
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Allow a student to withdraw their application if it is still in initial stages.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    try:
        app_obj_id = ObjectId(application_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID format.")

    app = await db["applications"].find_one({
        "_id": app_obj_id,
        "user_id": ObjectId(current_user["id"]),
    })
    if not app:
        raise HTTPException(status_code=404, detail="Application not found or unauthorized.")

    if app.get("status") in ["Selected", "Rejected", "Withdrawn"]:
        raise HTTPException(status_code=400, detail=f"Cannot withdraw an application in '{app.get('status')}' stage.")

    now = datetime.now(timezone.utc)
    history_entry = {
        "status": "Withdrawn",
        "updated_by": str(current_user["id"]),
        "updated_at": now,
        "notes": "Application withdrawn by candidate.",
    }

    await db["applications"].update_one(
        {"_id": app_obj_id},
        {
            "$set": {
                "status": "Withdrawn",
                "updated_at": now,
            },
            "$push": {
                "status_history": history_entry,
            },
        }
    )

    updated_app = await db["applications"].find_one({"_id": app_obj_id})
    job = await db["jobs"].find_one({"_id": app["job_id"]})
    return ApplicationResponse(**serialize_application(updated_app, job_doc=job))
