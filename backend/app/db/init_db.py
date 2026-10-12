import asyncio
import logging
from datetime import datetime, timezone
from pymongo import ASCENDING, IndexModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import get_password_hash
from app.db.mongodb import db_instance, connect_to_mongo, close_mongo_connection

logger = logging.getLogger("uvicorn.error")

async def init_database_indexes(db: AsyncIOMotorDatabase) -> None:
    """
    Create necessary indexes and unique constraints across all collections.
    """
    logger.info("Setting up MongoDB collections and indexes...")

    # 1. Users collection indexes
    await db["users"].create_indexes([
        IndexModel([("email", ASCENDING)], unique=True, name="uniq_user_email"),
        IndexModel([("role", ASCENDING)], name="idx_user_role"),
    ])

    # 2. Student profiles collection indexes
    await db["student_profiles"].create_indexes([
        IndexModel([("user_id", ASCENDING)], unique=True, name="uniq_profile_user_id"),
        IndexModel([("roll_number", ASCENDING)], unique=True, sparse=True, name="uniq_profile_roll_number"),
        IndexModel([("department", ASCENDING)], name="idx_profile_department"),
        IndexModel([("graduation_year", ASCENDING)], name="idx_profile_grad_year"),
        IndexModel([("cgpa", ASCENDING)], name="idx_profile_cgpa"),
    ])

    # 3. Jobs collection indexes
    await db["jobs"].create_indexes([
        IndexModel([("status", ASCENDING)], name="idx_job_status"),
        IndexModel([("graduation_year", ASCENDING)], name="idx_job_grad_year"),
        IndexModel([("application_deadline", ASCENDING)], name="idx_job_deadline"),
        IndexModel([("created_at", ASCENDING)], name="idx_job_created_at"),
    ])

    # 4. Applications collection indexes
    # CRITICAL: Compound unique index prevents duplicate applications at the database level
    await db["applications"].create_indexes([
        IndexModel(
            [("job_id", ASCENDING), ("student_id", ASCENDING)],
            unique=True,
            name="uniq_application_job_student"
        ),
        IndexModel([("job_id", ASCENDING), ("status", ASCENDING)], name="idx_app_job_status"),
        IndexModel([("student_id", ASCENDING)], name="idx_app_student_id"),
        IndexModel([("applied_at", ASCENDING)], name="idx_app_applied_at"),
    ])

    # 5. Interviews collection indexes
    await db["interviews"].create_indexes([
        IndexModel([("job_id", ASCENDING)], name="idx_interview_job"),
        IndexModel([("student_id", ASCENDING)], name="idx_interview_student"),
        IndexModel([("scheduled_at", ASCENDING)], name="idx_interview_date"),
    ])

    # 6. Notifications collection indexes
    await db["notifications"].create_indexes([
        IndexModel([("user_id", ASCENDING), ("read", ASCENDING)], name="idx_notif_user_read"),
        IndexModel([("created_at", ASCENDING)], name="idx_notif_created_at"),
    ])

    # 7. Audit logs collection indexes
    await db["audit_logs"].create_indexes([
        IndexModel([("timestamp", ASCENDING)], name="idx_audit_timestamp"),
        IndexModel([("user_id", ASCENDING)], name="idx_audit_user_id"),
    ])

    # 8. Seed default Super Admin account if not present
    existing_admin = await db["users"].find_one({"email": "admin@tpo.college.edu"})
    if not existing_admin:
        now = datetime.now(timezone.utc)
        await db["users"].insert_one({
            "full_name": "Placement Director",
            "email": "admin@tpo.college.edu",
            "hashed_password": get_password_hash("Admin@12345"),
            "role": "tpo_admin",
            "designation": "Placement Director",
            "permissions": ["*"],
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })
        logger.info("Seeded default Super Admin: admin@tpo.college.edu")

    logger.info("All MongoDB indexes initialized successfully!")

async def main():
    await connect_to_mongo()
    if db_instance.db is not None:
        await init_database_indexes(db_instance.db)
    else:
        print("Failed to initialize indexes: database client not connected.")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(main())
