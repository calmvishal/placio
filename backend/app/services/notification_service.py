from datetime import datetime, timezone
from typing import Optional, List, Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

async def create_notification(
    db: AsyncIOMotorDatabase,
    user_id: Any,
    title: str,
    message: str,
    notif_type: str = "general",
    link: Optional[str] = None,
) -> dict:
    """
    Creates an in-app notification for a given user.
    """
    if isinstance(user_id, str):
        user_id = ObjectId(user_id)

    doc = {
        "user_id": user_id,
        "title": title.strip(),
        "message": message.strip(),
        "type": notif_type,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["notifications"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc

async def create_notifications_bulk(
    db: AsyncIOMotorDatabase,
    user_ids: List[Any],
    title: str,
    message: str,
    notif_type: str = "general",
    link: Optional[str] = None,
) -> int:
    """
    Creates notifications for multiple users in a single operation.
    """
    if not user_ids:
        return 0

    now = datetime.now(timezone.utc)
    docs = [
        {
            "user_id": ObjectId(uid) if isinstance(uid, str) else uid,
            "title": title.strip(),
            "message": message.strip(),
            "type": notif_type,
            "link": link,
            "read": False,
            "created_at": now,
        }
        for uid in user_ids
    ]
    result = await db["notifications"].insert_many(docs)
    return len(result.inserted_ids)
