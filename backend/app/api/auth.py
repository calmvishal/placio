from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserChangePasswordRequest,
)
from bson import ObjectId
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.mongodb import get_database
from app.api.deps import get_current_user

router = APIRouter()

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
)
async def register_student(
    payload: UserRegisterRequest,
    db = Depends(get_database),
):
    """
    Register a new student account.
    Validates email uniqueness, hashes password, creates user record,
    initializes the linked student profile, and issues a JWT session token.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable. Please try again shortly.",
        )

    normalized_email = payload.email.strip().lower()

    # 0. Check portal registration settings
    reg_settings = await db["portal_settings"].find_one({"key": "student_registration"})
    if reg_settings:
        if not reg_settings.get("registration_enabled", True):
            closed_msg = reg_settings.get("closed_message", "Student registrations are currently closed by the Placement Cell.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=closed_msg)

        if reg_settings.get("domain_restriction_enabled", False):
            allowed_domains = [d.strip().lower() for d in reg_settings.get("allowed_email_domains", []) if d.strip()]
            if allowed_domains:
                email_domain = normalized_email.split("@")[-1].lower() if "@" in normalized_email else ""
                if email_domain not in allowed_domains:
                    domains_str = ", ".join([f"@{d}" for d in allowed_domains])
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Registration is restricted to authorized college domains ({domains_str}). Your domain '@{email_domain}' is not permitted.",
                    )

    # Determine verification status
    is_verified = True
    if reg_settings and reg_settings.get("require_manual_verification", False):
        if reg_settings.get("auto_verify_allowed_domains", True):
            allowed_domains = [d.strip().lower() for d in reg_settings.get("allowed_email_domains", []) if d.strip()]
            email_domain = normalized_email.split("@")[-1].lower() if "@" in normalized_email else ""
            if email_domain in allowed_domains:
                is_verified = True
            else:
                is_verified = False
        else:
            is_verified = False

    # 1. Check if email already registered
    existing_user = await db["users"].find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    # 2. Check if roll number already assigned (if provided)
    if payload.roll_number:
        clean_roll = payload.roll_number.strip().upper()
        existing_profile = await db["student_profiles"].find_one({"roll_number": clean_roll})
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration or Roll Number '{clean_roll}' is already registered.",
            )
    else:
        clean_roll = None

    now = datetime.now(timezone.utc)

    # 3. Create User Document (role: student)
    user_doc = {
        "email": normalized_email,
        "hashed_password": get_password_hash(payload.password),
        "full_name": payload.full_name.strip(),
        "role": "student",
        "is_active": True,
        "is_verified": is_verified,
        "created_at": now,
        "updated_at": now,
    }

    user_result = await db["users"].insert_one(user_doc)
    user_id = user_result.inserted_id

    # 4. Create Linked Student Profile Document
    profile_doc = {
        "user_id": user_id,
        "phone": "",
        "department": payload.department or "CSE",
        "branch": payload.department or "Computer Science & Engineering",
        "graduation_year": payload.graduation_year or 2026,
        "tenth_percentage": 0.0,
        "twelfth_percentage": 0.0,
        "cgpa": 0.0,
        "active_backlogs": 0,
        "history_of_backlogs": 0,
        "skills": [],
        "projects": [],
        "certifications": [],
        "resume_filename": None,
        "resume_url": None,
        "github_url": "",
        "linkedin_url": "",
        "created_at": now,
        "updated_at": now,
        "is_verified": is_verified,
    }
    if clean_roll:
        profile_doc["roll_number"] = clean_roll

    await db["student_profiles"].insert_one(profile_doc)

    # 5. Issue JWT Access Token
    token = create_access_token(
        subject=normalized_email,
        role="student",
        user_id=str(user_id)
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role="student",
        user_id=str(user_id),
        full_name=payload.full_name.strip(),
        email=normalized_email,
        is_verified=is_verified,
    )

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login for Students and TPO staff",
)
async def login_user(
    payload: UserLoginRequest,
    db = Depends(get_database),
):
    """
    Authenticate a user (Student, TPO Admin, or TPO Staff) via email and password.
    Returns a cryptographically signed JWT access token.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable.",
        )

    normalized_email = payload.email.strip().lower()

    # Look up user
    user = await db["users"].find_one({"email": normalized_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password with bcrypt
    if not verify_password(payload.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check account active state
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact the placement office.",
        )

    # Generate token
    user_id_str = str(user["_id"])
    role = user.get("role", "student")
    token = create_access_token(
        subject=normalized_email,
        role=role,
        user_id=user_id_str,
    )

    designation = user.get("designation")
    if not designation:
        designation = "Super Admin / Director" if role == "tpo_admin" else ("Placement Officer" if role == "tpo_staff" else "Student")
    permissions = user.get("permissions", ["*"] if role == "tpo_admin" else [])

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=role,
        user_id=user_id_str,
        full_name=user.get("full_name", ""),
        email=normalized_email,
        designation=designation,
        permissions=permissions,
        is_verified=user.get("is_verified", True),
    )

@router.get(
    "/me",
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: dict = Depends(get_current_user),
):
    """
    Return the profile details and role of the currently authenticated user.
    """
    role = current_user.get("role", "student")
    designation = current_user.get("designation")
    if not designation:
        designation = "Super Admin / Director" if role == "tpo_admin" else ("Placement Officer" if role == "tpo_staff" else "Student")
    permissions = current_user.get("permissions", ["*"] if role == "tpo_admin" else [])

    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "role": role,
        "is_active": current_user.get("is_active", True),
        "is_verified": current_user.get("is_verified", True),
        "created_at": current_user.get("created_at"),
        "designation": designation,
        "permissions": permissions,
    }

@router.put(
    "/profile",
    summary="Update current user profile information",
)
async def update_my_profile(
    payload: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Update the authenticated user's full name, email, and contact info.
    Validates email uniqueness across all users.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable.",
        )

    user_oid = ObjectId(current_user["id"])
    update_data = {"updated_at": datetime.now(timezone.utc)}

    if payload.full_name is not None and payload.full_name.strip():
        update_data["full_name"] = payload.full_name.strip()

    if payload.email is not None and payload.email.strip():
        norm_email = payload.email.strip().lower()
        if norm_email != current_user["email"].lower():
            existing = await db["users"].find_one({"email": norm_email, "_id": {"$ne": user_oid}})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An account with email '{norm_email}' already exists.",
                )
            update_data["email"] = norm_email

    if payload.phone is not None:
        update_data["phone"] = payload.phone.strip()

    await db["users"].update_one({"_id": user_oid}, {"$set": update_data})
    updated_user = await db["users"].find_one({"_id": user_oid})

    role = updated_user.get("role", "student")
    designation = updated_user.get("designation")
    if not designation:
        designation = "Super Admin / Director" if role == "tpo_admin" else ("Placement Officer" if role == "tpo_staff" else "Student")
    permissions = updated_user.get("permissions", ["*"] if role == "tpo_admin" else [])

    return {
        "id": str(updated_user["_id"]),
        "email": updated_user["email"],
        "full_name": updated_user.get("full_name", ""),
        "role": role,
        "is_active": updated_user.get("is_active", True),
        "designation": designation,
        "permissions": permissions,
        "message": "Profile updated successfully.",
    }

@router.put(
    "/change-password",
    summary="Change password for authenticated user",
)
async def change_my_password(
    payload: UserChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Securely change user's own password with current password verification.
    """
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable.",
        )

    user_oid = ObjectId(current_user["id"])
    user_doc = await db["users"].find_one({"_id": user_oid})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found.")

    if not verify_password(payload.current_password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect.",
        )

    new_hash = get_password_hash(payload.new_password)
    await db["users"].update_one(
        {"_id": user_oid},
        {"$set": {"hashed_password": new_hash, "updated_at": datetime.now(timezone.utc)}}
    )

    return {"message": "Password changed successfully."}

