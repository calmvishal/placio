from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from bson import ObjectId
import re

from app.db.mongodb import get_database
from app.api.deps import require_role
from app.core.security import get_password_hash
from app.schemas.staff import (
    StaffCreateRequest,
    StaffAccessUpdateRequest,
    StaffPasswordResetRequest,
    StaffStatusUpdateRequest,
    StaffResponse,
)

router = APIRouter()

AVAILABLE_PERMISSIONS = [
    {
        "id": "manage_drives",
        "name": "Manage Job Drives",
        "category": "Drives & Placements",
        "description": "Create, publish, edit, or close campus placement drives.",
    },
    {
        "id": "schedule_interviews",
        "name": "Schedule & Track Interviews",
        "category": "Interviews",
        "description": "Schedule interview slots, assign meeting links, and update interview rounds.",
    },
    {
        "id": "manage_students",
        "name": "Student Directory & Verification",
        "category": "Students",
        "description": "Enroll students, reset credentials, review resumes, or deactivate accounts.",
    },
    {
        "id": "manage_applicants",
        "name": "Applicant Tracking System (ATS)",
        "category": "Applications",
        "description": "Shortlist, advance stages, record assessment scores, or issue placement offers.",
    },
    {
        "id": "export_data",
        "name": "Placement Reports & Excel Exports",
        "category": "Analytics & Exports",
        "description": "Generate and download Excel student rosters and placement metric reports.",
    },
    {
        "id": "send_notifications",
        "name": "Broadcast Notices & Reminders",
        "category": "Communications",
        "description": "Dispatch automated interview email reminders and broadcast system notices.",
    },
    {
        "id": "manage_courses",
        "name": "Course & Department Catalog",
        "category": "Academics",
        "description": "Configure eligible degrees, departments, and academic branches.",
    },
]

@router.get(
    "/permissions",
    summary="List available granular system permissions for TPO staff",
)
async def list_available_permissions(
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
):
    """
    Returns the catalog of assignable granular permissions and categories.
    Accessible only by TPO Super Admin.
    """
    return AVAILABLE_PERMISSIONS

@router.get(
    "",
    response_model=List[StaffResponse],
    summary="List all TPO staff coordinators and administrators",
)
async def list_staff_members(
    search: Optional[str] = Query(None, description="Search by name, email, or designation"),
    role: Optional[str] = Query(None, description="Filter by role: 'all', 'tpo_admin', or 'tpo_staff'"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Retrieve all TPO staff members and administrators with their roles, designations,
    and assigned permissions.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    query: Dict[str, Any] = {
        "role": {"$in": ["tpo_admin", "tpo_staff"]}
    }

    if role and role != "all":
        query["role"] = role

    if is_active is not None:
        query["is_active"] = is_active

    if search and search.strip():
        term = re.escape(search.strip())
        query["$or"] = [
            {"full_name": {"$regex": term, "$options": "i"}},
            {"email": {"$regex": term, "$options": "i"}},
            {"designation": {"$regex": term, "$options": "i"}},
        ]

    cursor = db["users"].find(query).sort("created_at", -1)
    results = []

    async for doc in cursor:
        user_role = doc.get("role", "tpo_staff")
        designation = doc.get("designation")
        if not designation:
            designation = "Super Admin / Director" if user_role == "tpo_admin" else "Placement Coordinator"

        permissions = doc.get("permissions")
        if permissions is None:
            permissions = [p["id"] for p in AVAILABLE_PERMISSIONS] if user_role == "tpo_admin" else []

        results.append(
            StaffResponse(
                id=str(doc["_id"]),
                email=doc["email"],
                full_name=doc.get("full_name", ""),
                role=user_role,
                designation=designation,
                permissions=permissions,
                is_active=doc.get("is_active", True),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at"),
            )
        )

    return results

@router.post(
    "",
    response_model=StaffResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new TPO staff member or administrator",
)
async def create_staff_member(
    payload: StaffCreateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Add a new TPO officer or coordinator with custom designation and permissions.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    norm_email = payload.email.strip().lower()

    if payload.role not in ["tpo_admin", "tpo_staff"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'tpo_staff' or 'tpo_admin'."
        )

    # Check if email is already registered
    existing = await db["users"].find_one({"email": norm_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{norm_email}' already exists."
        )

    now = datetime.now(timezone.utc)
    hashed_pwd = get_password_hash(payload.password)

    # If tpo_admin, grant full permissions by default if empty
    permissions = payload.permissions
    if payload.role == "tpo_admin" and not permissions:
        permissions = [p["id"] for p in AVAILABLE_PERMISSIONS]

    designation = (payload.designation or "").strip()
    if not designation:
        designation = "Placement Director" if payload.role == "tpo_admin" else "Placement Coordinator"

    new_user = {
        "email": norm_email,
        "hashed_password": hashed_pwd,
        "full_name": payload.full_name.strip(),
        "role": payload.role,
        "designation": designation,
        "permissions": permissions,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    result = await db["users"].insert_one(new_user)
    inserted_id = str(result.inserted_id)

    return StaffResponse(
        id=inserted_id,
        email=norm_email,
        full_name=new_user["full_name"],
        role=new_user["role"],
        designation=designation,
        permissions=permissions,
        is_active=True,
        created_at=now,
        updated_at=now,
    )

@router.put(
    "/{user_id}/access",
    response_model=StaffResponse,
    summary="Update staff member role, designation, and special permissions",
)
async def update_staff_access(
    user_id: str,
    payload: StaffAccessUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Modify staff member designation, change between Staff and Admin,
    or assign granular permissions.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    target_user = await db["users"].find_one({"_id": oid, "role": {"$in": ["tpo_admin", "tpo_staff"]}})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TPO Staff account not found."
        )

    update_fields: Dict[str, Any] = {
        "updated_at": datetime.now(timezone.utc)
    }

    if payload.full_name is not None and payload.full_name.strip():
        update_fields["full_name"] = payload.full_name.strip()

    if payload.designation is not None:
        update_fields["designation"] = payload.designation.strip()

    if payload.role is not None:
        if payload.role not in ["tpo_admin", "tpo_staff"]:
            raise HTTPException(status_code=400, detail="Role must be 'tpo_admin' or 'tpo_staff'.")
        
        # Guard: check if current user is demoting themselves and if they are the only active admin
        if str(current_user["id"]) == user_id and payload.role != "tpo_admin":
            admin_count = await db["users"].count_documents({"role": "tpo_admin", "is_active": True})
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot remove Super Admin privileges from the sole active Super Admin account."
                )
        update_fields["role"] = payload.role

    if payload.permissions is not None:
        update_fields["permissions"] = payload.permissions

    await db["users"].update_one({"_id": oid}, {"$set": update_fields})
    updated_doc = await db["users"].find_one({"_id": oid})

    user_role = updated_doc.get("role", "tpo_staff")
    designation = updated_doc.get("designation")
    if not designation:
        designation = "Super Admin / Director" if user_role == "tpo_admin" else "Placement Coordinator"

    permissions = updated_doc.get("permissions")
    if permissions is None:
        permissions = [p["id"] for p in AVAILABLE_PERMISSIONS] if user_role == "tpo_admin" else []

    return StaffResponse(
        id=str(updated_doc["_id"]),
        email=updated_doc["email"],
        full_name=updated_doc.get("full_name", ""),
        role=user_role,
        designation=designation,
        permissions=permissions,
        is_active=updated_doc.get("is_active", True),
        created_at=updated_doc.get("created_at"),
        updated_at=updated_doc.get("updated_at"),
    )

@router.put(
    "/{user_id}/status",
    summary="Activate or deactivate a TPO staff account",
)
async def update_staff_status(
    user_id: str,
    payload: StaffStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Deactivate or reactivate a staff member's account.
    Deactivated accounts are immediately blocked from logging in.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    if str(current_user["id"]) == user_id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin cannot deactivate their own active account."
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    target_user = await db["users"].find_one({"_id": oid, "role": {"$in": ["tpo_admin", "tpo_staff"]}})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TPO Staff account not found."
        )

    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"is_active": payload.is_active, "updated_at": datetime.now(timezone.utc)}}
    )

    action_label = "activated" if payload.is_active else "deactivated"
    return {
        "message": f"Staff account successfully {action_label}.",
        "is_active": payload.is_active
    }

@router.put(
    "/{user_id}/password",
    summary="Reset or update a staff member's password",
)
async def reset_staff_password(
    user_id: str,
    payload: StaffPasswordResetRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Set a new password for a TPO staff member or administrator.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    target_user = await db["users"].find_one({"_id": oid, "role": {"$in": ["tpo_admin", "tpo_staff"]}})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TPO Staff account not found."
        )

    new_hashed = get_password_hash(payload.new_password)
    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"hashed_password": new_hashed, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"message": "Staff password updated successfully."}

@router.delete(
    "/{user_id}",
    summary="Permanently remove a TPO staff member",
)
async def delete_staff_member(
    user_id: str,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin"])),
    db = Depends(get_database),
):
    """
    Remove a staff coordinator or administrator from the system.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable."
        )

    if str(current_user["id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin cannot delete their own account."
        )

    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format.")

    target_user = await db["users"].find_one({"_id": oid, "role": {"$in": ["tpo_admin", "tpo_staff"]}})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TPO Staff account not found."
        )

    # Guard: prevent removing the sole remaining admin
    if target_user.get("role") == "tpo_admin":
        admin_count = await db["users"].count_documents({"role": "tpo_admin"})
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the sole Super Admin account."
            )

    await db["users"].delete_one({"_id": oid})
    return {"message": "Staff member removed successfully."}
