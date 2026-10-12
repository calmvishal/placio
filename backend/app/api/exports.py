import re
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from bson import ObjectId
from app.db.mongodb import get_database
from app.api.deps import require_role
from app.services.excel_service import generate_applicants_excel

router = APIRouter()

@router.get(
    "/applications/{job_id}/excel",
    summary="Export applicants to genuine Microsoft Excel (.xlsx) file",
    description="Generates an OpenPyXL formatted Excel workbook containing verified candidate records, stage statuses, and notes. Protected for TPO Administrators and Staff.",
)
async def export_job_applicants_excel(
    job_id: str,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by recruitment stage"),
    branch_filter: Optional[str] = Query(None, alias="branch", description="Filter by department/branch"),
    min_cgpa_filter: Optional[float] = Query(None, alias="min_cgpa", description="Filter by minimum CGPA"),
    current_user: Dict[str, Any] = Depends(require_role(["tpo_admin", "tpo_staff"])),
):
    """
    Export placement drive applicants into a styled, injection-protected .xlsx file.
    """
    if not ObjectId.is_valid(job_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid placement drive identifier.",
        )

    db = get_database()
    job = await db["jobs"].find_one({"_id": ObjectId(job_id)})
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Placement drive opportunity not found.",
        )

    # Build query filter for applications
    query: Dict[str, Any] = {"job_id": ObjectId(job_id)}
    if status_filter:
        query["status"] = status_filter
    if branch_filter:
        query["student_snapshot.department"] = branch_filter
    if min_cgpa_filter is not None:
        query["student_snapshot.cgpa"] = {"$gte": min_cgpa_filter}

    cursor = db["applications"].find(query).sort("applied_at", 1)
    applications = await cursor.to_list(length=2000)

    # Generate genuine .xlsx via OpenPyXL service
    excel_stream = generate_applicants_excel(job, applications)

    # Build sanitized download filename
    company_clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", job.get("company_name", "Company"))
    role_clean = re.sub(r"[^a-zA-Z0-9_\-]", "_", job.get("title", "Recruitment"))
    filename = f"{company_clean}_{role_clean}_Applicants.xlsx"

    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
