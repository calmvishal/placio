import pytest
import uuid
from io import BytesIO
from fastapi.testclient import TestClient
from app.main import app

def generate_minimal_pdf(text: str = "Rahul Sharma, Skills: Python, React, FastAPI") -> bytes:
    """
    Generate minimal in-memory binary PDF file for testing text extraction.
    """
    # Simple standard minimal PDF 1.4 stream
    content = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length {len(text) + 25} >>
stream
BT
/F1 12 Tf
72 712 Td
({text}) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000320 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
393
%%EOF"""
    return content.encode("latin1")

@pytest.fixture
def student_auth_token():
    unique_id = uuid.uuid4().hex[:6]
    student_data = {
        "email": f"student_prof_{unique_id}@college.edu",
        "password": "Password123!",
        "full_name": f"Profile Test Student {unique_id}",
        "roll_number": f"PRF{unique_id.upper()}",
        "department": "CSE",
        "graduation_year": 2026
    }
    with TestClient(app) as tc:
        reg_res = tc.post("/api/auth/register", json=student_data)
        assert reg_res.status_code == 201
        return reg_res.json()["access_token"]

def test_get_student_profile(student_auth_token):
    with TestClient(app) as tc:
        res = tc.get("/api/students/profile", headers={"Authorization": f"Bearer {student_auth_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "user_id" in data
        assert data["department"] == "CSE"
        assert "completion_percentage" in data

def test_update_student_profile_academic_and_skills(student_auth_token):
    with TestClient(app) as tc:
        update_payload = {
            "phone": "+91 9876543210",
            "cgpa": 8.75,
            "tenth_percentage": 91.5,
            "twelfth_percentage": 89.0,
            "active_backlogs": 0,
            "skills": ["Python", "FastAPI", "React", "MongoDB"],
            "projects": [
                {
                    "title": "Placement Management Portal",
                    "description": "Full-stack academic portal with AI resume matching.",
                    "tech_stack": ["FastAPI", "React", "MongoDB"],
                    "github_link": "https://github.com/test/portal"
                }
            ],
            "github_url": "https://github.com/rahul-test",
            "linkedin_url": "https://linkedin.com/in/rahul-test"
        }
        res = tc.put(
            "/api/students/profile",
            json=update_payload,
            headers={"Authorization": f"Bearer {student_auth_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["cgpa"] == 8.75
        assert data["tenth_percentage"] == 91.5
        assert len(data["skills"]) == 4
        assert len(data["projects"]) == 1
        assert data["completion_percentage"] > 50

def test_invalid_cgpa_rejected(student_auth_token):
    with TestClient(app) as tc:
        res = tc.put(
            "/api/students/profile",
            json={"cgpa": 11.5}, # Invalid: CGPA cannot exceed 10.0
            headers={"Authorization": f"Bearer {student_auth_token}"}
        )
        assert res.status_code == 422 # Pydantic Validation Error

def test_tpo_forbidden_from_student_profile_route():
    with TestClient(app) as tc:
        # Login as TPO Admin
        tpo_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        tpo_token = tpo_login.json()["access_token"]

        # TPO Admin tries to call student profile endpoint
        res = tc.get("/api/students/profile", headers={"Authorization": f"Bearer {tpo_token}"})
        assert res.status_code == 403
        assert "Access forbidden" in res.json()["detail"]

def test_resume_pdf_upload_and_text_extraction(student_auth_token):
    with TestClient(app) as tc:
        pdf_bytes = generate_minimal_pdf("Jane Doe, Computer Science. Skills: Python, FastAPI.")
        files = {
            "file": ("jane_resume.pdf", BytesIO(pdf_bytes), "application/pdf")
        }
        res = tc.post(
            "/api/students/resume/upload",
            files=files,
            headers={"Authorization": f"Bearer {student_auth_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "resume_" in data["filename"]

        # Check profile has resume
        prof_res = tc.get("/api/students/profile", headers={"Authorization": f"Bearer {student_auth_token}"})
        assert prof_res.json()["has_resume"] is True

def test_non_pdf_resume_upload_rejected(student_auth_token):
    with TestClient(app) as tc:
        files = {
            "file": ("malicious_script.exe", BytesIO(b"not a pdf"), "application/octet-stream")
        }
        res = tc.post(
            "/api/students/resume/upload",
            files=files,
            headers={"Authorization": f"Bearer {student_auth_token}"}
        )
        assert res.status_code == 400
        assert "Only genuine PDF" in res.json()["detail"]
