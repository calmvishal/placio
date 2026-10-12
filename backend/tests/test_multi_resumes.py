import pytest
import uuid
from io import BytesIO
from fastapi.testclient import TestClient
from app.main import app

def generate_minimal_pdf(text: str = "Rahul Sharma, Skills: Python, React, FastAPI") -> bytes:
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
def student_client():
    unique_id = uuid.uuid4().hex[:6]
    student_data = {
        "email": f"res_student_{unique_id}@college.edu",
        "password": "Password123!",
        "full_name": f"Multi Resume Student {unique_id}",
        "roll_number": f"MR{unique_id.upper()}",
        "department": "CSE",
        "graduation_year": 2026,
    }
    with TestClient(app) as tc:
        reg_res = tc.post("/api/auth/register", json=student_data)
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]
        tc.headers.update({"Authorization": f"Bearer {token}"})
        yield tc

def test_multi_resume_lifecycle(student_client):
    # 1. Initially student has empty resumes list
    prof_res = student_client.get("/api/students/profile")
    assert prof_res.status_code == 200
    assert prof_res.json()["resumes"] == []

    # 2. Upload first resume (Fullstack Resume)
    pdf_1 = generate_minimal_pdf("Candidate skills: React, Node.js, JavaScript, Tailwind")
    files_1 = {"file": ("fullstack_resume.pdf", BytesIO(pdf_1), "application/pdf")}
    data_1 = {"title": "Fullstack Web Resume"}
    up_1 = student_client.post("/api/students/resume/upload", files=files_1, data=data_1)
    assert up_1.status_code == 200
    res_1 = up_1.json()
    assert res_1["success"] is True
    assert res_1["is_primary"] is True
    resume_1_id = res_1["resume_id"]

    # 3. Upload second resume (AI / ML Resume)
    pdf_2 = generate_minimal_pdf("Candidate skills: Python, PyTorch, Scikit-Learn, Pandas, Machine Learning")
    files_2 = {"file": ("ai_ml_resume.pdf", BytesIO(pdf_2), "application/pdf")}
    data_2 = {"title": "Machine Learning Specialist Resume", "is_primary": "false"}
    up_2 = student_client.post("/api/students/resume/upload", files=files_2, data=data_2)
    assert up_2.status_code == 200
    res_2 = up_2.json()
    assert res_2["success"] is True
    assert res_2["is_primary"] is False
    resume_2_id = res_2["resume_id"]

    # 4. List resumes
    list_res = student_client.get("/api/students/resumes")
    assert list_res.status_code == 200
    resumes = list_res.json()
    assert len(resumes) == 2
    assert any(r["id"] == resume_1_id and r["is_primary"] is True for r in resumes)
    assert any(r["id"] == resume_2_id and r["is_primary"] is False for r in resumes)

    # 5. Download specific resume with resume_id
    dl_res = student_client.get(f"/api/students/resume/download?resume_id={resume_2_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"

    # 6. Switch primary resume to resume_2
    primary_res = student_client.put(f"/api/students/resumes/{resume_2_id}/primary")
    assert primary_res.status_code == 200
    updated_resumes = primary_res.json()
    assert any(r["id"] == resume_2_id and r["is_primary"] is True for r in updated_resumes)
    assert any(r["id"] == resume_1_id and r["is_primary"] is False for r in updated_resumes)

    # 7. Delete resume_1
    del_res = student_client.delete(f"/api/students/resumes/{resume_1_id}")
    assert del_res.status_code == 200

    # Verify only 1 resume remains and it remains primary
    list_after = student_client.get("/api/students/resumes").json()
    assert len(list_after) == 1
    assert list_after[0]["id"] == resume_2_id
    assert list_after[0]["is_primary"] is True
