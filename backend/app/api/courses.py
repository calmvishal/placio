from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.api.deps import get_current_user, require_role
from app.db.mongodb import get_database
from app.schemas.course import CourseCreateRequest, CourseResponse

router = APIRouter()

DEFAULT_COURSES = [
    {"code": "CSE", "name": "Computer Science & Engineering", "description": "Core computer engineering and algorithms"},
    {"code": "IT", "name": "Information Technology", "description": "Enterprise software and information systems"},
    {"code": "ECE", "name": "Electronics & Communication", "description": "Embedded systems and communication networks"},
    {"code": "EEE", "name": "Electrical & Electronics", "description": "Power systems and electrical automation"},
    {"code": "MECH", "name": "Mechanical Engineering", "description": "Robotics, thermodynamics and CAD/CAM"},
    {"code": "CIVIL", "name": "Civil Engineering", "description": "Structural engineering and infrastructure"},
    {"code": "AIDS", "name": "AI & Data Science", "description": "Artificial intelligence and statistical modeling"},
    {"code": "CSBS", "name": "CS & Business Systems", "description": "Computer science with business management"},
    {"code": "MCA", "name": "Master of Computer Applications", "description": "Postgraduate computer software applications"},
    {"code": "MBA", "name": "Master of Business Administration", "description": "Business analytics and HR/Marketing"},
]

async def ensure_default_courses(db):
    """Seed initial standard courses if collection is empty."""
    count = await db["courses"].count_documents({})
    if count == 0:
        now = datetime.now(timezone.utc)
        docs = [
            {
                "code": c["code"].strip().upper(),
                "name": c["name"].strip(),
                "description": c.get("description", ""),
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            }
            for c in DEFAULT_COURSES
        ]
        await db["courses"].insert_many(docs)

@router.get("", response_model=List[CourseResponse], summary="Get all available college courses and branches")
async def get_courses(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Fetch all active academic courses and engineering branches.
    Accessible to both students and TPO administrators.
    """
    await ensure_default_courses(db)
    cursor = db["courses"].find({"is_active": True}).sort("code", 1)
    docs = await cursor.to_list(length=200)
    return [
        CourseResponse(
            id=str(d["_id"]),
            code=d["code"],
            name=d["name"],
            description=d.get("description", ""),
            is_active=d.get("is_active", True),
            created_at=d.get("created_at"),
        )
        for d in docs
    ]

@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED, summary="Add a new course or branch (TPO only)")
async def create_course(
    payload: CourseCreateRequest,
    current_user: dict = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db=Depends(get_database),
):
    """
    Add a new course / department branch (e.g., AERO, BIOTECH, M.TECH CSE).
    Enforces uniqueness of course code.
    """
    code_normalized = payload.code.strip().upper()
    name_clean = payload.name.strip()

    # Check for duplicate code
    existing = await db["courses"].find_one({"code": code_normalized})
    if existing:
        if not existing.get("is_active", True):
            # Reactivate if previously deactivated
            await db["courses"].update_one(
                {"_id": existing["_id"]},
                {"$set": {"is_active": True, "name": name_clean, "description": payload.description}}
            )
            existing["is_active"] = True
            existing["name"] = name_clean
            return CourseResponse(
                id=str(existing["_id"]),
                code=existing["code"],
                name=existing["name"],
                description=existing.get("description", ""),
                is_active=True,
                created_at=existing.get("created_at"),
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Course with code '{code_normalized}' already exists.",
        )

    now = datetime.now(timezone.utc)
    new_doc = {
        "code": code_normalized,
        "name": name_clean,
        "description": payload.description.strip() if payload.description else "",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db["courses"].insert_one(new_doc)
    new_doc["_id"] = result.inserted_id

    return CourseResponse(
        id=str(new_doc["_id"]),
        code=new_doc["code"],
        name=new_doc["name"],
        description=new_doc["description"],
        is_active=True,
        created_at=now,
    )

@router.delete("/{code}", summary="Deactivate a course/branch (TPO Admin only)")
async def delete_course(
    code: str,
    current_user: dict = Depends(require_role(["tpo_admin"])),
    db=Depends(get_database),
):
    """
    Deactivates a course or department branch.
    """
    code_normalized = code.strip().upper()
    existing = await db["courses"].find_one({"code": code_normalized})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course with code '{code_normalized}' not found.",
        )

    # Soft delete / set is_active=False to preserve historic snapshot references
    await db["courses"].update_one(
        {"_id": existing["_id"]},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": f"Course '{code_normalized}' successfully removed."}
