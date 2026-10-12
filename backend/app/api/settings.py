from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from datetime import datetime, timezone

from app.db.mongodb import get_database
from app.api.deps import require_role
from app.schemas.settings import (
    RegistrationSettingsResponse,
    RegistrationSettingsUpdateRequest,
)

router = APIRouter()

DEFAULT_REGISTRATION_SETTINGS = {
    "key": "student_registration",
    "registration_enabled": True,
    "domain_restriction_enabled": False,
    "allowed_email_domains": ["college.edu"],
    "require_manual_verification": False,
    "auto_verify_allowed_domains": True,
    "closed_message": "Student registrations are currently closed by the Placement Cell.",
}

@router.get(
    "/registration",
    response_model=RegistrationSettingsResponse,
    summary="Get current student self-registration settings and domain rules",
)
async def get_registration_settings(db = Depends(get_database)):
    """
    Publicly accessible endpoint returning whether student registration is currently open,
    allowed domains for domain-matching, and verification mode.
    """
    if db is None:
        return RegistrationSettingsResponse(**DEFAULT_REGISTRATION_SETTINGS)

    record = await db["portal_settings"].find_one({"key": "student_registration"})
    if not record:
        return RegistrationSettingsResponse(**DEFAULT_REGISTRATION_SETTINGS)

    return RegistrationSettingsResponse(
        registration_enabled=record.get("registration_enabled", True),
        domain_restriction_enabled=record.get("domain_restriction_enabled", False),
        allowed_email_domains=record.get("allowed_email_domains", ["college.edu"]),
        require_manual_verification=record.get("require_manual_verification", False),
        auto_verify_allowed_domains=record.get("auto_verify_allowed_domains", True),
        closed_message=record.get("closed_message", "Student registrations are currently closed by the Placement Cell."),
    )

@router.put(
    "/registration",
    response_model=RegistrationSettingsResponse,
    summary="Update student self-registration settings and allowed domains",
)
async def update_registration_settings(
    payload: RegistrationSettingsUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
    db = Depends(get_database),
):
    """
    Update registration status, email domain restriction rules, and verification requirements.
    Accessible to TPO Admin and Staff.
    """
    if db is None:
        raise HTTPException(status_code=503, detail="Database service unavailable.")

    existing = await db["portal_settings"].find_one({"key": "student_registration"})
    data = dict(existing) if existing else dict(DEFAULT_REGISTRATION_SETTINGS)

    if payload.registration_enabled is not None:
        data["registration_enabled"] = payload.registration_enabled
    if payload.domain_restriction_enabled is not None:
        data["domain_restriction_enabled"] = payload.domain_restriction_enabled
    if payload.allowed_email_domains is not None:
        # Clean and sanitize domain strings (e.g. remove leading '@', lower case)
        cleaned = [d.strip().lstrip("@").lower() for d in payload.allowed_email_domains if d.strip()]
        data["allowed_email_domains"] = cleaned
    if payload.require_manual_verification is not None:
        data["require_manual_verification"] = payload.require_manual_verification
    if payload.auto_verify_allowed_domains is not None:
        data["auto_verify_allowed_domains"] = payload.auto_verify_allowed_domains
    if payload.closed_message is not None and payload.closed_message.strip():
        data["closed_message"] = payload.closed_message.strip()

    data["updated_at"] = datetime.now(timezone.utc)
    data["updated_by"] = current_user.get("full_name", "TPO")

    await db["portal_settings"].update_one(
        {"key": "student_registration"},
        {"$set": data},
        upsert=True
    )

    return RegistrationSettingsResponse(
        registration_enabled=data.get("registration_enabled", True),
        domain_restriction_enabled=data.get("domain_restriction_enabled", False),
        allowed_email_domains=data.get("allowed_email_domains", ["college.edu"]),
        require_manual_verification=data.get("require_manual_verification", False),
        auto_verify_allowed_domains=data.get("auto_verify_allowed_domains", True),
        closed_message=data.get("closed_message", "Student registrations are currently closed by the Placement Cell."),
    )
