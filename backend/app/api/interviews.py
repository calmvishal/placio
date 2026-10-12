from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from bson import ObjectId
from app.db.mongodb import get_database
from app.api.deps import require_role, get_current_user
from app.services.notification_service import create_notification
from app.services.email_service import send_interview_scheduled_email, send_interview_reminder_email
from app.schemas.interview import (
    InterviewScheduleRequest,
    InterviewOutcomeUpdateRequest,
    InterviewResponse,
)

logger = logging.getLogger("tpo.interviews")
IST = timezone(timedelta(hours=5, minutes=30))

def format_interview_datetime(dt: datetime, fmt: str = "%d-%b-%Y %I:%M %p") -> str:
    """Format datetime converting to IST (+05:30) if timezone is UTC or aware."""
    if dt.tzinfo:
        dt = dt.astimezone(IST)
    else:
        dt = dt.replace(tzinfo=timezone.utc).astimezone(IST)
    return dt.strftime(fmt)

router = APIRouter()

async def serialize_interview(doc: dict, db) -> dict:
    """
    Enriches raw interview document with company, drive, and student details defensively.
    """
    job_id = doc.get("job_id")
    student_id = doc.get("student_id")

    job = None
    if job_id:
        job_obj_id = ObjectId(job_id) if ObjectId.is_valid(str(job_id)) else job_id
        job = await db["jobs"].find_one({"_id": job_obj_id})

    student_user = None
    student_profile = None

    if student_id:
        student_obj_id = ObjectId(student_id) if ObjectId.is_valid(str(student_id)) else student_id
        student_user = await db["users"].find_one({"_id": student_obj_id})
        if student_user:
            student_profile = await db["student_profiles"].find_one({
                "$or": [{"user_id": student_obj_id}, {"user_id": str(student_obj_id)}]
            })
        else:
            student_profile = await db["student_profiles"].find_one({"_id": student_obj_id})
            if student_profile and student_profile.get("user_id"):
                student_user = await db["users"].find_one({"_id": student_profile["user_id"]})

    company_name = (job.get("company_name") if job else None) or "Company"
    job_title = (job.get("title") if job else None) or "Position"
    salary_package = (job.get("salary_package") if job else None) or "Not Disclosed"

    student_name = (student_user.get("full_name") if student_user else None) or "Student"
    student_roll = (student_profile.get("roll_number") if student_profile else None) or "N/A"
    student_department = (student_profile.get("department") if student_profile else None) or "CSE"

    sched = doc.get("scheduled_at")
    if isinstance(sched, datetime):
        if sched.tzinfo is None:
            sched = sched.replace(tzinfo=timezone.utc)
    else:
        sched = datetime.now(timezone.utc)

    created_at = doc.get("created_at")
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
    else:
        created_at = datetime.now(timezone.utc)

    return {
        "id": str(doc["_id"]),
        "job_id": str(job_id) if job_id else "",
        "company_name": company_name,
        "job_title": job_title,
        "salary_package": salary_package,
        "student_id": str(student_id) if student_id else "",
        "student_name": student_name,
        "student_roll": student_roll,
        "student_department": student_department,
        "round_name": doc.get("round_name") or "Technical Round 1",
        "scheduled_at": sched,
        "mode": doc.get("mode") or "Online",
        "venue_or_link": doc.get("venue_or_link") or "Meeting link not provided",
        "instructions": doc.get("instructions"),
        "outcome": doc.get("outcome") or "Pending",
        "outcome_notes": doc.get("outcome_notes"),
        "created_at": created_at,
    }

@router.post(
    "/schedule",
    response_model=List[InterviewResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Schedule interviews for shortlisted students (TPO only)",
)
async def schedule_interviews(
    payload: InterviewScheduleRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Schedules an interview round for one or multiple students.
    Automatically transitions student applications to 'Interview Scheduled' and sends in-app notifications & emails.
    """
    if not ObjectId.is_valid(payload.job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    job_obj_id = ObjectId(payload.job_id)
    job = await db["jobs"].find_one({"_id": job_obj_id})
    if not job:
        raise HTTPException(status_code=404, detail="Placement drive not found.")

    company_name = job.get("company_name", "Company")
    job_title = job.get("title", "Position")
    now = datetime.now(timezone.utc)
    created_records = []

    for sid in payload.student_ids:
        if not ObjectId.is_valid(sid):
            continue

        raw_id = ObjectId(sid)
        student_user = await db["users"].find_one({"_id": raw_id})
        profile = None

        if student_user:
            profile = await db["student_profiles"].find_one({"user_id": raw_id})
        else:
            profile = await db["student_profiles"].find_one({"_id": raw_id})
            if profile:
                student_user = await db["users"].find_one({"_id": profile.get("user_id")})

        if not student_user:
            continue

        student_user_id = student_user["_id"]

        # Find application
        app_matchers = [
            {"user_id": student_user_id},
            {"student_id": student_user_id},
        ]
        if profile and "_id" in profile:
            app_matchers.append({"student_id": profile["_id"]})

        application = await db["applications"].find_one({
            "job_id": job_obj_id,
            "$or": app_matchers,
        })

        sched_dt = payload.scheduled_at
        if sched_dt.tzinfo is None:
            sched_dt = sched_dt.replace(tzinfo=timezone.utc)

        interview_doc = {
            "job_id": job_obj_id,
            "student_id": student_user_id,
            "application_id": application["_id"] if application else None,
            "round_name": payload.round_name.strip(),
            "scheduled_at": sched_dt,
            "mode": payload.mode,
            "venue_or_link": payload.venue_or_link.strip(),
            "instructions": payload.instructions.strip() if payload.instructions else None,
            "outcome": "Pending",
            "outcome_notes": None,
            "created_by": ObjectId(current_user["id"]),
            "created_at": now,
            "updated_at": now,
        }

        res = await db["interviews"].insert_one(interview_doc)
        interview_doc["_id"] = res.inserted_id

        # Format date & time converted to IST (+05:30)
        formatted_datetime = format_interview_datetime(sched_dt, "%d-%b-%Y %I:%M %p")

        # Automatically advance application stage if requested
        if payload.advance_stage and application:
            history_note = f"{payload.round_name} scheduled ({payload.mode}) for {formatted_datetime}."
            await db["applications"].update_one(
                {"_id": application["_id"]},
                {
                    "$set": {"status": "Interview Scheduled", "updated_at": now},
                    "$push": {
                        "status_history": {
                            "status": "Interview Scheduled",
                            "updated_by": str(current_user["id"]),
                            "updated_at": now,
                            "notes": history_note,
                        }
                    },
                },
            )

        # Dispatch student in-app notification
        time_str = format_interview_datetime(sched_dt, "%d-%b-%Y at %I:%M %p")
        notif_msg = f"You are scheduled for '{payload.round_name}' with {company_name} on {time_str} ({payload.mode}). Venue/Link: {payload.venue_or_link}"
        await create_notification(
            db=db,
            user_id=student_user_id,
            title=f"Interview Scheduled: {payload.round_name}",
            message=notif_msg,
            notif_type="interview_scheduled",
            link="/student/interviews",
        )

        # Dispatch student email notification in background
        if student_user.get("email"):
            background_tasks.add_task(
                send_interview_scheduled_email,
                to_email=student_user["email"],
                student_name=student_user.get("full_name", "Student"),
                company_name=company_name,
                job_title=job_title,
                round_name=payload.round_name,
                scheduled_at=sched_dt,
                mode=payload.mode,
                venue_or_link=payload.venue_or_link,
                instructions=payload.instructions,
            )

        serialized = await serialize_interview(interview_doc, db)
        created_records.append(InterviewResponse(**serialized))

    if not created_records:
        raise HTTPException(status_code=400, detail="No valid students found to schedule.")

    return created_records

@router.get(
    "/my",
    response_model=List[InterviewResponse],
    summary="Get interviews scheduled for current student",
)
async def get_my_interviews(
    current_user: Dict[str, Any] = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Returns all interview rounds (upcoming and completed) for the logged-in student.
    """
    student_id = ObjectId(current_user["id"])
    cursor = db["interviews"].find({"student_id": student_id}).sort("scheduled_at", 1)
    docs = await cursor.to_list(length=100)

    results = []
    for d in docs:
        serialized = await serialize_interview(d, db)
        results.append(InterviewResponse(**serialized))
    return results

@router.get(
    "/job/{job_id}",
    response_model=List[InterviewResponse],
    summary="Get all interviews for a placement drive (TPO only)",
)
async def get_job_interviews(
    job_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Returns all scheduled interviews for a specific placement drive.
    """
    if not ObjectId.is_valid(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    cursor = db["interviews"].find({"job_id": ObjectId(job_id)}).sort("scheduled_at", 1)
    docs = await cursor.to_list(length=500)

    results = []
    for d in docs:
        serialized = await serialize_interview(d, db)
        results.append(InterviewResponse(**serialized))
    return results

@router.get(
    "/all",
    response_model=List[InterviewResponse],
    summary="Get all scheduled interviews across drives (TPO only)",
)
async def get_all_interviews(
    outcome_filter: Optional[str] = Query(None, alias="outcome"),
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Returns all interviews across drives with optional outcome filter.
    """
    query = {}
    if outcome_filter:
        query["outcome"] = outcome_filter

    cursor = db["interviews"].find(query).sort("scheduled_at", 1).limit(500)
    docs = await cursor.to_list(length=500)

    results = []
    for d in docs:
        try:
            serialized = await serialize_interview(d, db)
            results.append(InterviewResponse(**serialized))
        except Exception as e:
            logger.warning(f"Skipping malformed interview record {d.get('_id')}: {e}")
            continue
    return results

@router.put(
    "/{interview_id}/outcome",
    response_model=InterviewResponse,
    summary="Record interview outcome and feedback (TPO only)",
)
async def update_interview_outcome(
    interview_id: str,
    payload: InterviewOutcomeUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Records interview result (Cleared, Not Cleared, Absent, Rescheduled) and optionally advances application status.
    """
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID format.")

    inv_obj_id = ObjectId(interview_id)
    interview = await db["interviews"].find_one({"_id": inv_obj_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview record not found.")

    valid_outcomes = ["Pending", "Cleared", "Not Cleared", "Absent", "Rescheduled"]
    if payload.outcome not in valid_outcomes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid outcome. Must be one of: {', '.join(valid_outcomes)}",
        )

    now = datetime.now(timezone.utc)
    update_data = {
        "outcome": payload.outcome,
        "outcome_notes": payload.outcome_notes.strip() if payload.outcome_notes else None,
        "updated_at": now,
    }

    await db["interviews"].update_one({"_id": inv_obj_id}, {"$set": update_data})

    # Optional application status update
    if payload.update_application_status and interview.get("application_id"):
        app_id = interview["application_id"]
        status_note = f"Interview {interview.get('round_name')} outcome: {payload.outcome}. {payload.outcome_notes or ''}"
        await db["applications"].update_one(
            {"_id": app_id},
            {
                "$set": {
                    "status": payload.update_application_status,
                    "updated_at": now,
                },
                "$push": {
                    "status_history": {
                        "status": payload.update_application_status,
                        "updated_by": str(current_user["id"]),
                        "updated_at": now,
                        "notes": status_note.strip(),
                    }
                },
            },
        )

    # Dispatch notification to student
    job = await db["jobs"].find_one({"_id": interview.get("job_id")})
    company_name = job.get("company_name", "Company") if job else "Company"

    outcome_msg = f"Your interview for {interview.get('round_name')} with {company_name} has been evaluated as '{payload.outcome}'."
    if payload.outcome_notes:
        outcome_msg += f" Feedback: {payload.outcome_notes}"

    await create_notification(
        db=db,
        user_id=interview["student_id"],
        title=f"Interview Outcome: {payload.outcome}",
        message=outcome_msg,
        notif_type="interview_outcome",
        link="/student/interviews",
    )

    updated_doc = await db["interviews"].find_one({"_id": inv_obj_id})
    serialized = await serialize_interview(updated_doc, db)
    return InterviewResponse(**serialized)

@router.delete(
    "/{interview_id}",
    summary="Cancel / delete an interview schedule (TPO only)",
)
async def delete_interview(
    interview_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Cancels an interview schedule and notifies the candidate.
    """
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID format.")

    inv_obj_id = ObjectId(interview_id)
    interview = await db["interviews"].find_one({"_id": inv_obj_id})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    await db["interviews"].delete_one({"_id": inv_obj_id})

    # Notify student
    job = await db["jobs"].find_one({"_id": interview.get("job_id")})
    company_name = job.get("company_name", "Company") if job else "Company"

    await create_notification(
        db=db,
        user_id=interview["student_id"],
        title="Interview Schedule Update",
        message=f"The scheduled round '{interview.get('round_name')}' for {company_name} has been canceled or rescheduled by the placement cell.",
        notif_type="interview_update",
        link="/student/interviews",
    )

    return {"message": "Interview schedule deleted successfully."}

@router.post(
    "/{interview_id}/remind",
    summary="Send interview reminder to candidate (TPO only)",
)
async def send_interview_reminder(
    interview_id: str,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Dispatches in-app and email reminder to candidate about upcoming scheduled interview.
    """
    if not ObjectId.is_valid(interview_id):
        raise HTTPException(status_code=400, detail="Invalid interview ID.")

    interview = await db["interviews"].find_one({"_id": ObjectId(interview_id)})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview schedule not found.")

    serialized = await serialize_interview(interview, db)
    sched_dt = serialized["scheduled_at"]
    time_str = format_interview_datetime(sched_dt, "%d-%b-%Y at %I:%M %p")

    student_user = await db["users"].find_one({"_id": interview.get("student_id")})
    if not student_user:
        profile = await db["student_profiles"].find_one({"_id": interview.get("student_id")})
        if profile and profile.get("user_id"):
            student_user = await db["users"].find_one({"_id": profile["user_id"]})

    recipient_name = student_user.get("full_name", serialized["student_name"]) if student_user else serialized["student_name"]
    recipient_email = student_user.get("email") if student_user else None

    # Dispatch in-app notification
    notif_msg = (
        f"Reminder: You have an upcoming interview '{serialized['round_name']}' with {serialized['company_name']} "
        f"on {time_str} ({serialized['mode']}). Venue/Link: {serialized['venue_or_link']}"
    )
    if student_user:
        await create_notification(
            db=db,
            user_id=student_user["_id"],
            title=f"Reminder: Upcoming Interview - {serialized['round_name']}",
            message=notif_msg,
            notif_type="interview_reminder",
            link="/student/interviews",
        )

    # Dispatch email reminder in background
    if recipient_email:
        background_tasks.add_task(
            send_interview_reminder_email,
            to_email=recipient_email,
            student_name=recipient_name,
            company_name=serialized["company_name"],
            job_title=serialized["job_title"],
            round_name=serialized["round_name"],
            scheduled_at=sched_dt,
            mode=serialized["mode"],
            venue_or_link=serialized["venue_or_link"],
            instructions=serialized.get("instructions"),
        )

    return {
        "success": True,
        "message": f"Interview reminder successfully sent to {recipient_name} via email & in-app alert.",
    }

@router.post(
    "/remind-all",
    summary="Send interview reminders to all pending upcoming candidates (TPO only)",
)
async def send_all_interview_reminders(
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Sends bulk reminders to all candidates with Pending scheduled interviews.
    """
    pending_interviews = await db["interviews"].find({"outcome": "Pending"}).to_list(500)
    sent_count = 0

    for inv in pending_interviews:
        try:
            serialized = await serialize_interview(inv, db)
            sched_dt = serialized["scheduled_at"]
            time_str = format_interview_datetime(sched_dt, "%d-%b-%Y at %I:%M %p")

            student_user = await db["users"].find_one({"_id": inv.get("student_id")})
            if not student_user:
                profile = await db["student_profiles"].find_one({"_id": inv.get("student_id")})
                if profile and profile.get("user_id"):
                    student_user = await db["users"].find_one({"_id": profile["user_id"]})

            if student_user:
                notif_msg = (
                    f"Reminder: Upcoming interview '{serialized['round_name']}' with {serialized['company_name']} "
                    f"on {time_str} ({serialized['mode']}). Venue/Link: {serialized['venue_or_link']}"
                )
                await create_notification(
                    db=db,
                    user_id=student_user["_id"],
                    title=f"Reminder: {serialized['round_name']} Interview",
                    message=notif_msg,
                    notif_type="interview_reminder",
                    link="/student/interviews",
                )
                if student_user.get("email"):
                    background_tasks.add_task(
                        send_interview_reminder_email,
                        to_email=student_user["email"],
                        student_name=student_user.get("full_name", serialized["student_name"]),
                        company_name=serialized["company_name"],
                        job_title=serialized["job_title"],
                        round_name=serialized["round_name"],
                        scheduled_at=sched_dt,
                        mode=serialized["mode"],
                        venue_or_link=serialized["venue_or_link"],
                        instructions=serialized.get("instructions"),
                    )
                sent_count += 1
        except Exception:
            continue

    return {
        "success": True,
        "count": sent_count,
        "reminded_count": sent_count,
        "message": f"Reminders successfully dispatched to {sent_count} candidate(s).",
    }
