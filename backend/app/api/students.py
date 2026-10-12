import os
import re
import csv
import io
import openpyxl
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, StreamingResponse
from typing import Dict, Any, Optional, List

from app.api.deps import get_current_user, require_role
from app.db.mongodb import get_database
from app.core.security import get_password_hash
from app.schemas.student import (
    StudentProfileUpdateRequest,
    StudentProfileResponse,
    ResumeItem,
    StudentCreateByTpoRequest,
    StudentStatusUpdateRequest,
    StudentPasswordResetRequest,
    StudentVerificationUpdateRequest,
    StudentAdminListItem,
)
from app.services.resume_service import process_resume_upload, UPLOAD_FOLDER
from app.services.excel_service import generate_bulk_import_template

router = APIRouter()

def calculate_completion(profile: Dict[str, Any]) -> int:
    """
    Calculate an explainable profile completion percentage (0 - 100%).
    """
    score = 0
    # 1. Contact / Roll identification (20%)
    if profile.get("roll_number"):
        score += 10
    if profile.get("phone"):
        score += 10

    # 2. Academic Scores (30%)
    if profile.get("cgpa", 0.0) > 0:
        score += 15
    if profile.get("tenth_percentage", 0.0) > 0 and profile.get("twelfth_percentage", 0.0) > 0:
        score += 15

    # 3. Technical Skills (20%)
    if profile.get("skills") and len(profile["skills"]) > 0:
        score += 20

    # 4. Projects (15%)
    if profile.get("projects") and len(profile["projects"]) > 0:
        score += 15

    # 5. Resume (15%)
    if profile.get("resume_filename") or (profile.get("resumes") and len(profile["resumes"]) > 0):
        score += 15

    return min(score, 100)

def serialize_resumes(profile: Dict[str, Any]) -> List[ResumeItem]:
    """
    Format resumes list for response with defensive defaults and backwards compatibility.
    """
    resumes_list: List[ResumeItem] = []
    raw_resumes = profile.get("resumes", [])
    if raw_resumes:
        for r in raw_resumes:
            up_at = r.get("uploaded_at")
            if isinstance(up_at, str):
                try:
                    up_at = datetime.fromisoformat(up_at)
                except Exception:
                    up_at = datetime.now(timezone.utc)
            elif not isinstance(up_at, datetime):
                up_at = datetime.now(timezone.utc)

            resumes_list.append(
                ResumeItem(
                    id=str(r.get("id") or ObjectId()),
                    title=r.get("title") or r.get("original_name") or "Resume",
                    filename=r.get("filename", ""),
                    original_name=r.get("original_name", "resume.pdf"),
                    uploaded_at=up_at,
                    is_primary=bool(r.get("is_primary", False)),
                    extracted_characters=int(r.get("extracted_characters", len(r.get("extracted_text", "")))),
                )
            )
    elif profile.get("resume_filename"):
        up_at = profile.get("resume_uploaded_at") or profile.get("updated_at") or datetime.now(timezone.utc)
        resumes_list.append(
            ResumeItem(
                id="primary",
                title="Primary Resume",
                filename=profile["resume_filename"],
                original_name=profile.get("resume_original_name", "student_resume.pdf"),
                uploaded_at=up_at,
                is_primary=True,
                extracted_characters=len(profile.get("resume_extracted_text", "")),
            )
        )
    return resumes_list

@router.get(
    "/profile",
    response_model=StudentProfileResponse,
    summary="Get current student profile and completion status",
)
async def get_student_profile(
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Fetch the complete profile for the currently authenticated student.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_id = ObjectId(current_user["id"])
    profile = await db["student_profiles"].find_one({"user_id": user_id})

    if not profile:
        # Auto-create if somehow missing
        profile = {
            "user_id": user_id,
            "roll_number": None,
            "department": "CSE",
            "branch": "Computer Science & Engineering",
            "graduation_year": 2026,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db["student_profiles"].insert_one(profile)

    completion = calculate_completion(profile)
    resumes_list = serialize_resumes(profile)
    has_res = bool(profile.get("resume_filename")) or len(resumes_list) > 0

    return StudentProfileResponse(
        id=str(profile["_id"]),
        user_id=str(profile["user_id"]),
        full_name=current_user.get("full_name", ""),
        email=current_user.get("email", ""),
        roll_number=profile.get("roll_number"),
        phone=profile.get("phone", ""),
        department=profile.get("department", "CSE"),
        branch=profile.get("branch", "Computer Science & Engineering"),
        graduation_year=profile.get("graduation_year", 2026),
        tenth_percentage=profile.get("tenth_percentage", 0.0),
        twelfth_percentage=profile.get("twelfth_percentage", 0.0),
        cgpa=profile.get("cgpa", 0.0),
        active_backlogs=profile.get("active_backlogs", 0),
        history_of_backlogs=profile.get("history_of_backlogs", 0),
        skills=profile.get("skills", []),
        programming_languages=profile.get("programming_languages", []),
        projects=profile.get("projects", []),
        certifications=profile.get("certifications", []),
        github_url=profile.get("github_url", ""),
        linkedin_url=profile.get("linkedin_url", ""),
        resume_filename=profile.get("resume_filename"),
        resume_uploaded_at=profile.get("resume_uploaded_at"),
        has_resume=has_res,
        resumes=resumes_list,
        completion_percentage=completion,
        created_at=profile.get("created_at"),
        updated_at=profile.get("updated_at"),
    )

@router.put(
    "/profile",
    response_model=StudentProfileResponse,
    summary="Update student academic records and professional profile",
)
async def update_student_profile(
    payload: StudentProfileUpdateRequest,
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Update student profile fields with validation.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_id = ObjectId(current_user["id"])
    update_data = payload.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)

    # Convert projects Pydantic models to dicts if present
    if "projects" in update_data and update_data["projects"] is not None:
        update_data["projects"] = [
            p.model_dump() if hasattr(p, "model_dump") else p
            for p in update_data["projects"]
        ]

    await db["student_profiles"].update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )

    return await get_student_profile(current_user=current_user, db=db)

@router.post(
    "/resume/upload",
    summary="Upload resume PDF and append to student resume list",
)
async def upload_resume(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Upload and parse student resume in PDF format.
    Extracts text safely using pypdf and stores in the student's multi-resume collection.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_id = ObjectId(current_user["id"])
    upload_result = await process_resume_upload(file, user_id=str(user_id))

    profile = await db["student_profiles"].find_one({"user_id": user_id})
    raw_resumes = profile.get("resumes", []) if profile else []
    now = datetime.now(timezone.utc)

    # If student had legacy single resume but no resumes array yet, migrate it
    if not raw_resumes and profile and profile.get("resume_filename"):
        raw_resumes = [{
            "id": "primary_legacy",
            "title": profile.get("resume_original_name", "Primary Resume"),
            "filename": profile["resume_filename"],
            "original_name": profile.get("resume_original_name", "student_resume.pdf"),
            "extracted_text": profile.get("resume_extracted_text", ""),
            "extracted_characters": len(profile.get("resume_extracted_text", "")),
            "uploaded_at": profile.get("resume_uploaded_at") or now,
            "is_primary": True,
        }]

    # Determine if this new resume should be primary
    should_be_primary = is_primary or (len(raw_resumes) == 0)

    if should_be_primary:
        for r in raw_resumes:
            r["is_primary"] = False

    resume_id = str(ObjectId())
    clean_title = (title.strip() if title else "") or upload_result["original_filename"]
    new_resume = {
        "id": resume_id,
        "title": clean_title,
        "filename": upload_result["saved_filename"],
        "original_name": upload_result["original_filename"],
        "extracted_text": upload_result["extracted_text"],
        "extracted_characters": len(upload_result["extracted_text"]),
        "uploaded_at": now,
        "is_primary": should_be_primary,
    }
    raw_resumes.append(new_resume)

    update_fields: Dict[str, Any] = {
        "resumes": raw_resumes,
        "updated_at": now,
    }
    if should_be_primary:
        update_fields.update({
            "resume_filename": upload_result["saved_filename"],
            "resume_original_name": upload_result["original_filename"],
            "resume_extracted_text": upload_result["extracted_text"],
            "resume_uploaded_at": now,
        })

    await db["student_profiles"].update_one(
        {"user_id": user_id},
        {"$set": update_fields}
    )

    return {
        "success": True,
        "message": "Resume uploaded and saved to your resume list.",
        "filename": upload_result["saved_filename"],
        "has_extracted_text": bool(upload_result["extracted_text"]),
        "extracted_characters": len(upload_result["extracted_text"]),
        "resume_id": resume_id,
        "title": clean_title,
        "is_primary": should_be_primary,
    }

@router.get(
    "/resumes",
    response_model=List[ResumeItem],
    summary="List all resumes uploaded by the current student",
)
async def list_student_resumes(
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Fetch all resumes currently in the student's repository.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_id = ObjectId(current_user["id"])
    profile = await db["student_profiles"].find_one({"user_id": user_id})
    if not profile:
        return []

    return serialize_resumes(profile)

@router.put(
    "/resumes/{resume_id}/primary",
    response_model=List[ResumeItem],
    summary="Set specific resume as primary default",
)
async def set_primary_resume(
    resume_id: str,
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Mark one resume as primary and update top-level student profile resume attributes.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_id = ObjectId(current_user["id"])
    profile = await db["student_profiles"].find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    resumes = profile.get("resumes", [])
    if not resumes and profile.get("resume_filename"):
        # Synthesize from legacy profile
        resumes = [{
            "id": "primary",
            "title": "Primary Resume",
            "filename": profile["resume_filename"],
            "original_name": profile.get("resume_original_name", "student_resume.pdf"),
            "extracted_text": profile.get("resume_extracted_text", ""),
            "extracted_characters": len(profile.get("resume_extracted_text", "")),
            "uploaded_at": profile.get("resume_uploaded_at") or datetime.now(timezone.utc),
            "is_primary": True,
        }]

    target_resume = None
    for r in resumes:
        if str(r.get("id")) == str(resume_id):
            r["is_primary"] = True
            target_resume = r
        else:
            r["is_primary"] = False

    if not target_resume:
        raise HTTPException(status_code=404, detail="Specified resume not found in your profile.")

    now = datetime.now(timezone.utc)
    await db["student_profiles"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "resumes": resumes,
                "resume_filename": target_resume.get("filename"),
                "resume_original_name": target_resume.get("original_name"),
                "resume_extracted_text": target_resume.get("extracted_text", ""),
                "resume_uploaded_at": target_resume.get("uploaded_at") or now,
                "updated_at": now,
            }
        }
    )

    updated_profile = await db["student_profiles"].find_one({"user_id": user_id})
    return serialize_resumes(updated_profile)

@router.delete(
    "/resumes/{resume_id}",
    summary="Delete a resume from student repository",
)
async def delete_student_resume(
    resume_id: str,
    current_user: dict = Depends(require_role(["student"])),
    db = Depends(get_database),
):
    """
    Delete a resume from the student's multi-resume repository.
    Promotes another resume to primary if the deleted one was primary.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    user_id = ObjectId(current_user["id"])
    profile = await db["student_profiles"].find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    resumes = profile.get("resumes", [])
    filtered_resumes = [r for r in resumes if str(r.get("id")) != str(resume_id)]

    if len(filtered_resumes) == len(resumes):
        raise HTTPException(status_code=404, detail="Resume not found in your repository.")

    now = datetime.now(timezone.utc)
    # Check if primary still exists
    has_primary = any(r.get("is_primary") for r in filtered_resumes)
    if not has_primary and len(filtered_resumes) > 0:
        filtered_resumes[0]["is_primary"] = True

    primary_res = next((r for r in filtered_resumes if r.get("is_primary")), None)
    update_dict: Dict[str, Any] = {
        "resumes": filtered_resumes,
        "updated_at": now,
    }
    if primary_res:
        update_dict.update({
            "resume_filename": primary_res.get("filename"),
            "resume_original_name": primary_res.get("original_name"),
            "resume_extracted_text": primary_res.get("extracted_text", ""),
            "resume_uploaded_at": primary_res.get("uploaded_at") or now,
        })
    else:
        update_dict.update({
            "resume_filename": None,
            "resume_original_name": None,
            "resume_extracted_text": "",
            "resume_uploaded_at": None,
        })

    await db["student_profiles"].update_one(
        {"user_id": user_id},
        {"$set": update_dict}
    )

    return {"success": True, "message": "Resume deleted successfully."}

@router.get(
    "/resume/download",
    summary="Download stored resume PDF",
)
async def download_resume(
    student_id: Optional[str] = None,
    resume_id: Optional[str] = None,
    resume_filename: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Download resume PDF. Students can download their own;
    TPO Administrators can download any applicant's resume.
    Supports specific resume_id or resume_filename selection.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    # Determine which profile to fetch
    if current_user["role"] == "student":
        query = {"user_id": ObjectId(current_user["id"])}
    else:
        # TPO Admin / Staff accessing an applicant's resume
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id query parameter is required for TPO access.")
        query = {"$or": [{"_id": ObjectId(student_id)}, {"user_id": ObjectId(student_id)}]}

    profile = await db["student_profiles"].find_one(query)
    if not profile:
        raise HTTPException(status_code=404, detail="No profile document found for this student.")

    filename = None
    original_name = "student_resume.pdf"
    resumes = profile.get("resumes", [])

    # 1. By resume_id if specified
    if resume_id:
        target = next((r for r in resumes if str(r.get("id")) == str(resume_id)), None)
        if target:
            filename = target.get("filename")
            original_name = target.get("original_name", original_name)

    # 2. By resume_filename if specified
    if not filename and resume_filename:
        # Verify it belongs to profile
        if profile.get("resume_filename") == resume_filename or any(r.get("filename") == resume_filename for r in resumes):
            filename = resume_filename
            matched = next((r for r in resumes if r.get("filename") == resume_filename), None)
            if matched:
                original_name = matched.get("original_name", original_name)

    # 3. Default primary
    if not filename:
        primary = next((r for r in resumes if r.get("is_primary")), None)
        if primary:
            filename = primary.get("filename")
            original_name = primary.get("original_name", original_name)
        elif profile.get("resume_filename"):
            filename = profile["resume_filename"]
            original_name = profile.get("resume_original_name", original_name)

    if not filename:
        raise HTTPException(status_code=404, detail="No resume document found for this student.")

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Resume file does not exist on disk.")

    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=original_name,
    )

@router.get(
    "/all",
    response_model=List[StudentAdminListItem],
    summary="Get all student accounts and academic records (TPO only)",
)
async def get_all_students_for_tpo(
    search: Optional[str] = Query(None, description="Search by roll number, name, or email"),
    batch: Optional[int] = Query(None, description="Filter by graduation batch year"),
    department: Optional[str] = Query(None, description="Filter by department"),
    branch: Optional[str] = Query(None, description="Filter by branch"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_verified: Optional[bool] = Query(None, description="Filter by verification / approval status"),
    placement_status: Optional[str] = Query(None, description="Filter by 'placed' or 'unplaced'"),
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Fetch comprehensive student roster for TPO administration with multiple filters.
    Includes placement outcome, active status, verification state, and application metrics.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    match_query: Dict[str, Any] = {}
    if batch:
        match_query["graduation_year"] = batch
    if department:
        match_query["department"] = department
    if branch:
        match_query["branch"] = branch

    profiles_cursor = db["student_profiles"].find(match_query).sort("created_at", -1)
    profiles = await profiles_cursor.to_list(2000)

    user_ids = [p["user_id"] for p in profiles if p.get("user_id")]
    users_cursor = db["users"].find({"_id": {"$in": user_ids}})
    users_list = await users_cursor.to_list(2000)
    user_map = {str(u["_id"]): u for u in users_list}

    apps_cursor = db["applications"].find({"user_id": {"$in": user_ids}})
    apps_list = await apps_cursor.to_list(10000)
    apps_map: Dict[str, List[Dict[str, Any]]] = {}
    for app_item in apps_list:
        uid_str = str(app_item.get("user_id"))
        apps_map.setdefault(uid_str, []).append(app_item)

    results: List[StudentAdminListItem] = []
    search_term = search.strip().lower() if search else None

    for prof in profiles:
        uid_str = str(prof.get("user_id"))
        user_doc = user_map.get(uid_str)
        if not user_doc:
            continue

        full_name = user_doc.get("full_name", "")
        email = user_doc.get("email", "")
        roll_number = prof.get("roll_number") or ""
        active_status = bool(user_doc.get("is_active", True))
        verified_status = bool(user_doc.get("is_verified", True))

        if is_active is not None and active_status != is_active:
            continue

        if is_verified is not None and verified_status != is_verified:
            continue

        if search_term:
            in_name = search_term in full_name.lower()
            in_email = search_term in email.lower()
            in_roll = search_term in roll_number.lower()
            if not (in_name or in_email or in_roll):
                continue

        user_apps = apps_map.get(uid_str, [])
        selected_app = next((a for a in user_apps if a.get("status") == "Selected"), None)
        is_placed = selected_app is not None
        placement_company = selected_app.get("company_name") if selected_app else None

        if placement_status == "placed" and not is_placed:
            continue
        if placement_status == "unplaced" and is_placed:
            continue

        raw_resumes = prof.get("resumes", [])
        has_res = bool(prof.get("resume_filename")) or len(raw_resumes) > 0

        results.append(
            StudentAdminListItem(
                id=str(prof["_id"]),
                user_id=uid_str,
                full_name=full_name,
                email=email,
                roll_number=prof.get("roll_number"),
                phone=prof.get("phone", ""),
                department=prof.get("department", "CSE"),
                branch=prof.get("branch", "Computer Science & Engineering"),
                graduation_year=prof.get("graduation_year", 2026),
                cgpa=float(prof.get("cgpa", 0.0)),
                tenth_percentage=float(prof.get("tenth_percentage", 0.0)),
                twelfth_percentage=float(prof.get("twelfth_percentage", 0.0)),
                active_backlogs=int(prof.get("active_backlogs", 0)),
                is_active=active_status,
                is_verified=verified_status,
                is_placed=is_placed,
                placement_company=placement_company,
                applications_count=len(user_apps),
                has_resume=has_res,
                resume_filename=prof.get("resume_filename"),
                resumes_count=len(raw_resumes),
                created_at=prof.get("created_at"),
            )
        )

    return results

@router.post(
    "",
    response_model=StudentAdminListItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new student account manually (TPO only)",
)
async def create_student_by_tpo(
    payload: StudentCreateByTpoRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Directly register a student with credentials and academic baseline by TPO.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    normalized_email = payload.email.strip().lower()

    existing_user = await db["users"].find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    clean_roll = payload.roll_number.strip().upper() if payload.roll_number else None
    if clean_roll:
        existing_profile = await db["student_profiles"].find_one({"roll_number": clean_roll})
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Roll Number '{clean_roll}' is already assigned to another student.",
            )

    now = datetime.now(timezone.utc)

    user_doc = {
        "email": normalized_email,
        "hashed_password": get_password_hash(payload.password),
        "full_name": payload.full_name.strip(),
        "role": "student",
        "is_active": True,
        "is_verified": True,
        "created_at": now,
        "updated_at": now,
    }
    user_res = await db["users"].insert_one(user_doc)
    user_id = user_res.inserted_id

    profile_doc = {
        "user_id": user_id,
        "phone": payload.phone or "",
        "department": payload.department,
        "branch": payload.branch or payload.department,
        "graduation_year": payload.graduation_year,
        "tenth_percentage": float(payload.tenth_percentage or 0.0),
        "twelfth_percentage": float(payload.twelfth_percentage or 0.0),
        "cgpa": float(payload.cgpa or 0.0),
        "active_backlogs": 0,
        "history_of_backlogs": 0,
        "skills": [],
        "projects": [],
        "certifications": [],
        "resumes": [],
        "resume_filename": None,
        "is_verified": True,
        "created_at": now,
        "updated_at": now,
    }
    if clean_roll:
        profile_doc["roll_number"] = clean_roll

    profile_res = await db["student_profiles"].insert_one(profile_doc)

    return StudentAdminListItem(
        id=str(profile_res.inserted_id),
        user_id=str(user_id),
        full_name=payload.full_name.strip(),
        email=normalized_email,
        roll_number=clean_roll,
        phone=payload.phone or "",
        department=payload.department,
        branch=payload.branch or payload.department,
        graduation_year=payload.graduation_year,
        cgpa=float(payload.cgpa or 0.0),
        tenth_percentage=float(payload.tenth_percentage or 0.0),
        twelfth_percentage=float(payload.twelfth_percentage or 0.0),
        active_backlogs=0,
        is_active=True,
        is_placed=False,
        placement_company=None,
        applications_count=0,
        has_resume=False,
        resume_filename=None,
        resumes_count=0,
        created_at=now,
    )

@router.put(
    "/{user_id}/status",
    summary="Activate or Deactivate student account (TPO only)",
)
async def update_student_account_status(
    user_id: str,
    payload: StudentStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Toggle student account active/deactivated state.
    Deactivated accounts cannot log into the portal.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    user = await db["users"].find_one({"_id": ObjectId(user_id), "role": "student"})
    if not user:
        raise HTTPException(status_code=404, detail="Student user record not found.")

    now = datetime.now(timezone.utc)
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": payload.is_active, "updated_at": now}}
    )

    action_label = "activated" if payload.is_active else "deactivated"
    return {
        "success": True,
        "user_id": user_id,
        "is_active": payload.is_active,
        "message": f"Student account has been {action_label} successfully.",
    }

@router.put(
    "/{user_id}/password",
    summary="Change / Reset student password (TPO only)",
)
async def reset_student_password(
    user_id: str,
    payload: StudentPasswordResetRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Reset a student's login password.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    user = await db["users"].find_one({"_id": ObjectId(user_id), "role": "student"})
    if not user:
        raise HTTPException(status_code=404, detail="Student user record not found.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    now = datetime.now(timezone.utc)
    hashed = get_password_hash(payload.new_password)
    await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": hashed, "updated_at": now}}
    )

    return {
        "success": True,
        "user_id": user_id,
        "message": f"Password for student '{user.get('full_name', '')}' updated successfully.",
    }

@router.get(
    "/bulk-import/template",
    summary="Download Excel template for student bulk import",
)
async def download_student_import_template(
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
):
    """
    Generate and stream a genuine Excel workbook template with sample rows and column definitions.
    """
    stream = generate_bulk_import_template()
    filename = "PLACIO_Student_Bulk_Import_Template.xlsx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )

@router.post(
    "/bulk-import",
    summary="Bulk import student accounts from Excel or CSV file",
)
async def bulk_import_students(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Parse uploaded .xlsx or .csv student file, validate records, and batch-create student users and profiles.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".csv")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload an Excel (.xlsx) or CSV (.csv) file.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    raw_rows: List[Dict[str, Any]] = []

    if filename.endswith(".xlsx"):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))
            if len(rows) < 2:
                raise HTTPException(status_code=400, detail="Excel file must contain a header row and at least one student data row.")
            
            header_row = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
            for r_idx, row in enumerate(rows[1:], 2):
                if not any(row):
                    continue
                row_dict = {}
                for col_idx, val in enumerate(row):
                    if col_idx < len(header_row):
                        row_dict[header_row[col_idx]] = val
                raw_rows.append(row_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")
    else:
        # CSV parsing
        try:
            text = file_bytes.decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for r in reader:
                norm_r = {k.strip().lower(): v for k, v in r.items() if k}
                if any(norm_r.values()):
                    raw_rows.append(norm_r)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    if not raw_rows:
        raise HTTPException(status_code=400, detail="No valid data rows found in the uploaded file.")

    # Column key helpers
    def get_val(row_dict: Dict[str, Any], candidates: List[str], default="") -> str:
        for c in candidates:
            for k, v in row_dict.items():
                if c in k:
                    return str(v).strip() if v is not None else default
        return default

    imported = 0
    skipped = 0
    errors = []
    seen_emails = set()
    seen_rolls = set()
    now = datetime.now(timezone.utc)

    for idx, row in enumerate(raw_rows, 1):
        full_name = get_val(row, ["full name", "name", "student name"])
        email = get_val(row, ["email", "college email"]).lower()
        roll_num = get_val(row, ["roll number", "roll", "reg no", "registration"]).upper() or None
        dept = get_val(row, ["department", "dept"]) or "CSE"
        branch = get_val(row, ["branch", "stream"]) or dept
        grad_year_str = get_val(row, ["graduation year", "batch", "grad year", "year"])
        cgpa_str = get_val(row, ["cgpa", "gpa"])
        tenth_str = get_val(row, ["10th", "tenth"])
        twelfth_str = get_val(row, ["12th", "twelfth"])
        phone = get_val(row, ["phone", "mobile", "contact"])
        password = get_val(row, ["password", "initial password"]) or "Placio@2026"

        if not email or "@" not in email:
            skipped += 1
            errors.append({"row": idx, "email": email, "reason": "Missing or invalid email address."})
            continue

        if not full_name:
            skipped += 1
            errors.append({"row": idx, "email": email, "reason": "Missing student full name."})
            continue

        if email in seen_emails:
            skipped += 1
            errors.append({"row": idx, "email": email, "reason": "Duplicate email in uploaded file."})
            continue
        seen_emails.add(email)

        if roll_num:
            if roll_num in seen_rolls:
                skipped += 1
                errors.append({"row": idx, "email": email, "reason": f"Duplicate roll number '{roll_num}' in file."})
                continue
            seen_rolls.add(roll_num)

        # DB duplicate check
        existing_user = await db["users"].find_one({"email": email})
        if existing_user:
            skipped += 1
            errors.append({"row": idx, "email": email, "reason": f"Email '{email}' is already registered."})
            continue

        if roll_num:
            existing_prof = await db["student_profiles"].find_one({"roll_number": roll_num})
            if existing_prof:
                skipped += 1
                errors.append({"row": idx, "email": email, "reason": f"Roll number '{roll_num}' is already assigned."})
                continue

        # Convert numeric values safely
        try:
            grad_year = int(float(grad_year_str)) if grad_year_str else 2026
        except Exception:
            grad_year = 2026

        try:
            cgpa = float(cgpa_str) if cgpa_str else 0.0
        except Exception:
            cgpa = 0.0

        try:
            tenth = float(tenth_str) if tenth_str else 0.0
        except Exception:
            tenth = 0.0

        try:
            twelfth = float(twelfth_str) if twelfth_str else 0.0
        except Exception:
            twelfth = 0.0

        if len(password) < 6:
            password = "Placio@2026"

        user_doc = {
            "email": email,
            "hashed_password": get_password_hash(password),
            "full_name": full_name,
            "role": "student",
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "updated_at": now,
        }
        user_res = await db["users"].insert_one(user_doc)
        user_id = user_res.inserted_id

        profile_doc = {
            "user_id": user_id,
            "phone": phone,
            "department": dept,
            "branch": branch,
            "graduation_year": grad_year,
            "tenth_percentage": tenth,
            "twelfth_percentage": twelfth,
            "cgpa": cgpa,
            "active_backlogs": 0,
            "history_of_backlogs": 0,
            "skills": [],
            "projects": [],
            "certifications": [],
            "resume_filename": None,
            "resume_url": None,
            "resumes": [],
            "github_url": "",
            "linkedin_url": "",
            "is_verified": True,
            "created_at": now,
            "updated_at": now,
        }
        if roll_num:
            profile_doc["roll_number"] = roll_num

        await db["student_profiles"].insert_one(profile_doc)
        imported += 1

    return {
        "success": True,
        "total_rows": len(raw_rows),
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "message": f"Successfully imported {imported} student accounts. ({skipped} skipped)",
    }

@router.put(
    "/{user_id}/verify",
    summary="Update student verification / approval state (TPO only)",
)
async def update_student_verification(
    user_id: str,
    payload: StudentVerificationUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Approve or revoke verification status for a student account.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    oid = ObjectId(user_id)
    user = await db["users"].find_one({"_id": oid, "role": "student"})
    if not user:
        raise HTTPException(status_code=404, detail="Student account not found.")

    now = datetime.now(timezone.utc)
    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"is_verified": payload.is_verified, "updated_at": now}}
    )
    await db["student_profiles"].update_one(
        {"user_id": oid},
        {"$set": {"is_verified": payload.is_verified, "updated_at": now}}
    )

    action_label = "approved and verified" if payload.is_verified else "marked as unverified"
    return {
        "success": True,
        "user_id": user_id,
        "is_verified": payload.is_verified,
        "message": f"Student '{user.get('full_name')}' has been {action_label}.",
    }
