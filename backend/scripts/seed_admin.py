import asyncio
import os
import sys
from datetime import datetime, timezone
import argparse

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.security import get_password_hash
from app.db.mongodb import db_instance, connect_to_mongo, close_mongo_connection
from app.db.init_db import init_database_indexes

async def seed_super_admin(email: str, password: str, full_name: str) -> None:
    """
    Seed initial TPO Placement Administrator account securely.
    """
    await connect_to_mongo()
    if db_instance.db is None:
        print("[ERROR] Cannot connect to MongoDB. Verify your MONGODB_URI in .env")
        return

    db = db_instance.db
    # Ensure indexes exist
    await init_database_indexes(db)

    # Check if user already exists
    existing = await db["users"].find_one({"email": email.strip().lower()})
    if existing:
        print(f"[INFO] Administrator account '{email}' already exists. Skipping creation.")
        await close_mongo_connection()
        return

    # Hash password with native bcrypt
    hashed_pwd = get_password_hash(password)

    admin_doc = {
        "email": email.strip().lower(),
        "hashed_password": hashed_pwd,
        "full_name": full_name.strip(),
        "role": "tpo_admin", # Super-Admin Role
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db["users"].insert_one(admin_doc)
    print("=" * 60)
    print("[SUCCESS] SUPER-ADMIN ACCOUNT SUCCESSFULLY SEEDED!")
    print(f"  User ID:    {result.inserted_id}")
    print(f"  Email:      {email}")
    print(f"  Full Name:  {full_name}")
    print(f"  Role:       tpo_admin")
    print(f"  Password:   [PROTECTED - Bcrypt Hash Stored]")
    print("=" * 60)

    await close_mongo_connection()

def main():
    parser = argparse.ArgumentParser(description="Seed initial TPO Placement Administrator account.")
    parser.add_argument("--email", default=os.getenv("INITIAL_ADMIN_EMAIL", "admin@tpo.college.edu"), help="Admin email")
    parser.add_argument("--password", default=os.getenv("INITIAL_ADMIN_PASSWORD", "Admin@12345"), help="Admin initial password")
    parser.add_argument("--name", default=os.getenv("INITIAL_ADMIN_NAME", "Placement Director"), help="Admin full name")

    args = parser.parse_args()

    print(f"Seeding TPO Administrator ({args.email})...")
    asyncio.run(seed_super_admin(args.email, args.password, args.name))

if __name__ == "__main__":
    main()
