import os
import uuid
from io import BytesIO
from typing import Tuple, Dict, Any
from fastapi import UploadFile, HTTPException, status
from pypdf import PdfReader
from app.core.config import settings

UPLOAD_FOLDER = os.path.join(settings.UPLOAD_DIR, "resumes")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Safely extract plain text from an in-memory PDF byte stream using pypdf.
    Returns cleaned text string or empty string if encrypted/scanned.
    """
    try:
        reader = PdfReader(BytesIO(file_bytes))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                return "" # Cannot extract encrypted content without password
        
        extracted_pages = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_pages.append(text.strip())
        
        return "\n\n".join(extracted_pages)
    except Exception as e:
        # Gracefully handle corrupt or non-standard PDF formats
        return ""

async def process_resume_upload(file: UploadFile, user_id: str) -> Dict[str, Any]:
    """
    Validate, save, and extract text from an uploaded resume PDF.
    """
    # 1. Validate file extension
    filename = file.filename or "resume.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only genuine PDF (.pdf) documents are accepted.",
        )

    # 2. Read content and enforce size limits
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # 3. Generate collision-free safe file name
    safe_filename = f"resume_{user_id}_{uuid.uuid4().hex[:8]}.pdf"
    file_path = os.path.join(UPLOAD_FOLDER, safe_filename)

    # 4. Save to persistent storage
    with open(file_path, "wb") as f:
        f.write(content)

    # 5. Extract text for AI and eligibility search
    extracted_text = extract_text_from_pdf(content)

    return {
        "original_filename": filename,
        "saved_filename": safe_filename,
        "file_path": file_path,
        "file_size": len(content),
        "extracted_text": extracted_text,
    }
