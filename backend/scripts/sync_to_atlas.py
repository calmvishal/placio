import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient

async def sync_data_to_atlas(atlas_uri: str):
    print(f"Connecting to Local MongoDB (localhost:27017)...")
    local_client = AsyncIOMotorClient("mongodb://localhost:27017")
    local_db = local_client["tpo_portal_db"]

    print(f"Connecting to MongoDB Atlas...")
    atlas_client = AsyncIOMotorClient(atlas_uri)
    atlas_db = atlas_client["tpo_portal_db"]

    # Test connection
    try:
        await atlas_client.admin.command("ping")
        print(" Connected to MongoDB Atlas successfully!")
    except Exception as exc:
        print(f"❌ Failed to connect to Atlas: {exc}")
        return

    collections_to_sync = ["users", "student_profiles", "courses", "portal_settings"]

    for col_name in collections_to_sync:
        docs = await local_db[col_name].find({}).to_list(1000)
        if docs:
            # Drop old collection in Atlas and insert
            await atlas_db[col_name].delete_many({})
            await atlas_db[col_name].insert_many(docs)
            print(f" Synced {len(docs)} documents to Atlas '{col_name}'.")
        else:
            print(f"ℹ️ Collection '{col_name}' is empty locally, skipped.")

    print("\n Atlas Cloud Database is fully primed and ready for Vercel production!")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sync_to_atlas.py <YOUR_MONGODB_ATLAS_CONNECTION_STRING>")
        print("Example: python sync_to_atlas.py \"mongodb+srv://admin:pass@cluster0.xyz.mongodb.net/tpo_portal_db?retryWrites=true&w=majority\"")
    else:
        asyncio.run(sync_data_to_atlas(sys.argv[1]))
