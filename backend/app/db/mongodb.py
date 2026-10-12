import logging
from typing import Optional
import certifi
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
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
    if db_instance.client is not None and db_instance.db is not None:
        return

    try:
        uri = (settings.MONGODB_URI or "mongodb://localhost:27017").strip().strip('"').strip("'")
        # Automatically strip placeholder angle brackets if user pasted <password>
        import re
        uri = re.sub(r':<([^@>]+)>@', r':\1@', uri)
        display_uri = uri.split('@')[-1] if '@' in uri else 'local'
        logger.info(f"Connecting to MongoDB at {display_uri}...")
        
        client_kwargs = {
            "serverSelectionTimeoutMS": 10000,
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 20000,
            "readPreference": "secondaryPreferred",
        }
        
        # In cloud serverless (AWS Lambda / Vercel), provide certifi CA bundle for Atlas TLS
        if "mongodb+srv://" in uri or "tls=true" in uri.lower() or "ssl=true" in uri.lower():
            try:
                client_kwargs["tlsCAFile"] = certifi.where()
            except Exception:
                pass

        db_instance.client = AsyncIOMotorClient(uri, **client_kwargs)
        db_instance.db = db_instance.client[settings.DATABASE_NAME]
        logger.info(f"Successfully selected MongoDB database: '{settings.DATABASE_NAME}'")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        db_instance.client = None
        db_instance.db = None

async def close_mongo_connection() -> None:
    """
    Gracefully close MongoDB client connection on server shutdown.
    """
    if db_instance.client:
        logger.info("Closing MongoDB connection...")
        db_instance.client.close()
        db_instance.client = None
        db_instance.db = None
        logger.info("MongoDB connection closed.")

async def get_database() -> Optional[AsyncIOMotorDatabase]:
    """
    Dependency helper to retrieve the active MongoDB database instance.
    Automatically connects on-demand if running in serverless mode (Vercel).
    """
    if db_instance.db is None or db_instance.client is None:
        await connect_to_mongo()
    return db_instance.db

async def ping_database() -> dict:
    """
    Check live connectivity to MongoDB database.
    """
    if db_instance.client is None or db_instance.db is None:
        await connect_to_mongo()
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
