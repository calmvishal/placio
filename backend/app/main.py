from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, ping_database, db_instance
from app.db.init_db import init_database_indexes
from app.api.auth import router as auth_router
from app.api.students import router as students_router
from app.api.jobs import router as jobs_router
from app.api.applications import router as applications_router
from app.api.exports import router as exports_router
from app.api.notifications import router as notifications_router
from app.api.interviews import router as interviews_router
from app.api.ai import router as ai_router
from app.api.analytics import router as analytics_router
from app.api.courses import router as courses_router
from app.api.staff import router as staff_router
from app.api.settings import router as settings_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager to handle application startup and shutdown events cleanly.
    """
    # 1. Startup: Connect to MongoDB and set up indexes
    await connect_to_mongo()
    if db_instance.db is not None:
        try:
            await init_database_indexes(db_instance.db)
        except Exception as e:
            print(f"Index initialization warning: {e}")
    
    yield
    
    # 2. Shutdown: Close MongoDB connection gracefully
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Centralized Placement, Eligibility Verification, and AI-Assisted Recruitment Management API.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
cors_list = settings.cors_origins
allow_all = "*" in cors_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else cors_list,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$" if not allow_all else None,
    allow_credentials=True if not allow_all else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(students_router, prefix="/api/students", tags=["Students"])
app.include_router(jobs_router, prefix="/api/jobs", tags=["Placement Opportunities"])
app.include_router(applications_router, prefix="/api/applications", tags=["Applications"])
app.include_router(exports_router, prefix="/api/exports", tags=["Reports & Exports"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(interviews_router, prefix="/api/interviews", tags=["Interviews"])
app.include_router(ai_router, prefix="/api/ai", tags=["Advisory AI"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Placement Analytics"])
app.include_router(courses_router, prefix="/api/courses", tags=["Courses & Branches"])
app.include_router(staff_router, prefix="/api/staff", tags=["TPO Staff Management"])
app.include_router(settings_router, prefix="/api/settings", tags=["Portal Settings"])

@app.get("/")
def read_root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
        "status": "online",
    }

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint verifying backend status, environment configuration,
    and active database connectivity.
    """
    db_status = await ping_database()
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER,
        "database": db_status,
        "cors_origins": settings.cors_origins,
    }
