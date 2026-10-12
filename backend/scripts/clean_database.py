import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def purge_sample_data():
    uri = sys.argv[1] if len(sys.argv) > 1 else "mongodb://localhost:27017"
    client = AsyncIOMotorClient(uri)
    db = client["tpo_portal_db"]

    ALLOWED_EMAILS = [
        "tpo@saitm.ac.in",
        "admin@tpo.college.edu",
        "rahul.sharma@college.edu",
    ]

    allowed_users = await db["users"].find({"email": {"$in": ALLOWED_EMAILS}}).to_list(10)
    print(f"Found {len(allowed_users)} protected users:")
    for u in allowed_users:
        print(f"  - {u.get('email')} ({u.get('role')} - {u.get('full_name')})")

    allowed_user_ids = [u["_id"] for u in allowed_users]
    allowed_id_strs = [str(u["_id"]) for u in allowed_users]
    all_allowed_ids = allowed_user_ids + allowed_id_strs

    # 1. Delete users
    r_users = await db["users"].delete_many({"email": {"$nin": ALLOWED_EMAILS}})
    print(f"Deleted {r_users.deleted_count} sample users.")

    # 2. Delete student profiles not belonging to allowed users
    r_prof = await db["student_profiles"].delete_many({
        "user_id": {"$nin": all_allowed_ids}
    })
    print(f"Deleted {r_prof.deleted_count} sample student profiles.")

    # 3. Delete all sample jobs
    r_jobs = await db["jobs"].delete_many({})
    print(f"Deleted {r_jobs.deleted_count} sample jobs/drives.")

    # 4. Delete all sample applications
    r_apps = await db["applications"].delete_many({})
    print(f"Deleted {r_apps.deleted_count} sample applications.")

    # 5. Delete all sample interviews
    r_interviews = await db["interviews"].delete_many({})
    print(f"Deleted {r_interviews.deleted_count} sample interviews.")

    # 6. Delete all sample notifications
    r_notifs = await db["notifications"].delete_many({})
    print(f"Deleted {r_notifs.deleted_count} sample notifications.")

    # 7. Delete all sample audit logs
    r_audit = await db["audit_logs"].delete_many({})
    print(f"Deleted {r_audit.deleted_count} sample audit logs.")

    # 8. Delete all resumes not belonging to allowed users
    r_res = await db["resumes"].delete_many({"user_id": {"$nin": all_allowed_ids}})
    print(f"Deleted {r_res.deleted_count} sample resumes.")

    # Summary
    print("\n================ DATABASE SUMMARY AFTER PURGE ================")
    for col in [
        "users",
        "student_profiles",
        "jobs",
        "applications",
        "interviews",
        "notifications",
        "audit_logs",
        "courses",
        "portal_settings",
    ]:
        c = await db[col].count_documents({})
        print(f"Collection '{col}': {c} documents")

    print("\nRemaining Users:")
    remaining_users = await db["users"].find({}, {"email": 1, "role": 1, "full_name": 1}).to_list(10)
    for u in remaining_users:
        print(f"  * {u.get('email')} -> Role: {u.get('role')} | Name: {u.get('full_name')}")

if __name__ == "__main__":
    asyncio.run(purge_sample_data())
