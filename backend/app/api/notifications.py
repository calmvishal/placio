from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId
from pydantic import BaseModel
from app.db.mongodb import get_database
from app.api.deps import get_current_user, require_role
from app.core.config import settings
from app.services.email_service import send_email
from app.schemas.notification import NotificationResponse, NotificationListResponse

router = APIRouter()

def serialize_notification(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "message": doc.get("message", ""),
        "type": doc.get("type", "general"),
        "link": doc.get("link"),
        "read": doc.get("read", False),
        "created_at": doc.get("created_at"),
    }

@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get notifications for current authenticated user",
)
async def get_my_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Retrieves notification feed and unread badge count for the current user.
    """
    user_id = ObjectId(current_user["id"])
    cursor = db["notifications"].find({"user_id": user_id}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)

    unread_count = await db["notifications"].count_documents({"user_id": user_id, "read": False})
    total_count = await db["notifications"].count_documents({"user_id": user_id})

    notifications = [NotificationResponse(**serialize_notification(d)) for d in docs]

    return NotificationListResponse(
        notifications=notifications,
        unread_count=unread_count,
        total_count=total_count,
    )

@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a notification as read",
)
async def mark_notification_read(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Marks an individual notification as read.
    """
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification ID.")

    user_id = ObjectId(current_user["id"])
    notif_id = ObjectId(notification_id)

    res = await db["notifications"].find_one_and_update(
        {"_id": notif_id, "user_id": user_id},
        {"$set": {"read": True}},
        return_document=True,
    )
    if not res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    return NotificationResponse(**serialize_notification(res))

@router.put(
    "/mark-all-read",
    summary="Mark all notifications as read for current user",
)
async def mark_all_notifications_read(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Sets read=True on all unread notifications for the current user.
    """
    user_id = ObjectId(current_user["id"])
    result = await db["notifications"].update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}},
    )
    return {
        "message": "All notifications marked as read.",
        "modified_count": result.modified_count,
    }

@router.delete(
    "/{notification_id}",
    summary="Delete a notification",
)
async def delete_notification(
    notification_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db = Depends(get_database),
):
    """
    Removes a notification from the user's inbox.
    """
    if not ObjectId.is_valid(notification_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid notification ID.")

    user_id = ObjectId(current_user["id"])
    notif_id = ObjectId(notification_id)

    res = await db["notifications"].delete_one({"_id": notif_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    return {"message": "Notification deleted successfully."}

class TestEmailRequest(BaseModel):
    recipient_email: str

@router.get(
    "/email-config",
    summary="Get email notification service status (TPO only)",
)
async def get_email_config(
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
):
    return {
        "smtp_enabled": settings.SMTP_ENABLED,
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_user": settings.SMTP_USER,
        "smtp_from_email": settings.SMTP_FROM_EMAIL,
        "smtp_from_name": settings.SMTP_FROM_NAME,
        "mode": "live_smtp" if (settings.SMTP_ENABLED and settings.SMTP_USER) else "mock_demo",
    }

@router.post(
    "/test-email",
    summary="Send a test notification email (TPO only)",
)
async def send_test_email(
    payload: TestEmailRequest,
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
):
    result = await send_email(
        to_email=payload.recipient_email,
        subject="[Test] TPO Portal Email Notification Service Check",
        html_body="<p>This is a test notification from the College TPO Placement Portal.</p>",
        text_body="This is a test notification from the College TPO Placement Portal.",
    )
    return {
        "message": f"Test email dispatched ({result.get('status', 'sent')}).",
        "result": result,
    }
