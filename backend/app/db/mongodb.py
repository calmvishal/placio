from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
import logging
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

db_instance = MongoDB()

async def connect_to_mongo() -> None:
    """
    Establish asynchronous connection to MongoDB and select database.
    """
    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI.split('@')[-1]}...")
        db_instance.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        # Verify connection with a ping
        await db_instance.client.admin.command("ping")
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        logger.info(f"Successfully connected to MongoDB database: '{settings.DATABASE_NAME}'")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        # Do not crash the entire app; keep db as None so health endpoint can report disconnection
        db_instance.client = None
        db_instance.db = None

async def close_mongo_connection() -> None:
    """
    Gracefully close MongoDB client connection on server shutdown.
    """
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        logger.info("MongoDB connection closed.")

def get_database() -> Optional[AsyncIOMotorDatabase]:
    """
    Dependency helper to retrieve the active MongoDB database instance.
    """
    return db_instance.db

async def ping_database() -> dict:
    """
    Check live connectivity to MongoDB database.
    """
    if db_instance.client is None or db_instance.db is None:
        return {"connected": False, "error": "Database client not initialized"}
    try:
        await db_instance.client.admin.command("ping")
        return {
            "connected": True,
            "database_name": settings.DATABASE_NAME,
            "error": None
        }
    except Exception as exc:
        return {
            "connected": False,
            "error": str(exc)
        }
