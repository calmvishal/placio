import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai_service import extract_skills_deterministically

@pytest.fixture
def client():
    with TestClient(app) as tc:
        yield tc

@pytest.fixture
def tpo_token(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@tpo.college.edu",
        "password": "Admin@12345"
    })
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def student_auth(client):
    uid = uuid.uuid4().hex[:6]
    data = {
        "email": f"ai_student_{uid}@college.edu",
        "password": "Password123!",
        "full_name": f"AI Student {uid}",
        "roll_number": f"AI{uid.upper()}",
        "department": "CSE",
        "graduation_year": 2026,
    }
    reg = client.post("/api/auth/register", json=data)
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    user_id = reg.json()["user_id"]

    client.put(
        "/api/students/profile",
        json={
            "cgpa": 8.6,
            "tenth_percentage": 92.0,
            "twelfth_percentage": 90.0,
            "active_backlogs": 0,
            "department": "CSE",
            "graduation_year": 2026,
            "skills": ["Python", "FastAPI", "React", "Docker"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    return {"token": token, "email": data["email"], "user_id": user_id}

@pytest.fixture
def sample_job(client, tpo_token):
    job_payload = {
        "company_name": "Stripe",
        "title": "Backend Software Engineer",
        "description": "Develop high-reliability payment processing pipelines using Python, Docker, PostgreSQL, and Kubernetes.",
        "job_type": "Full-Time",
        "required_branches": ["CSE", "IT"],
        "min_cgpa": 7.5,
        "graduation_year": 2026,
        "max_active_backlogs": 0,
        "required_skills": ["Python", "Docker", "PostgreSQL", "Kubernetes", "System Design"],
        "location": "Bangalore",
        "work_mode": "Hybrid",
        "salary_package": "28 LPA",
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=20)).isoformat(),
        "status": "published",
    }
    res = client.post(
        "/api/jobs",
        json=job_payload,
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert res.status_code == 201
    return res.json()["id"]

def test_extract_skills_deterministically_direct():
    """Verify regex extraction of technical skills from free-form text."""
    sample_text = """
    Experienced in building web APIs with Python and FastAPI.
    Used Docker for containerization and MongoDB for data storage.
    Knowledge of Data Structures, Algorithms, and Git.
    """
    skills = extract_skills_deterministically(sample_text)
    assert "Python" in skills
    assert "FastAPI" in skills
    assert "Docker" in skills
    assert "MongoDB" in skills
    assert "Data Structures" in skills

def test_resume_analysis_endpoint(client, student_auth):
    """Test advisory resume analysis for student."""
    token = student_auth["token"]
    res = client.post(
        "/api/ai/resume/analyze",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert len(data["improvement_tips"]) > 0
    assert data["is_advisory"] is True
    assert "Advisory Notice" in data["disclaimer"]

def test_job_match_advisory_endpoint(client, student_auth, sample_job):
    """Test job match calculation, skill overlap, and gap recommendations."""
    token = student_auth["token"]
    res = client.get(
        f"/api/ai/job-match/{sample_job}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["company_name"] == "Stripe"
    assert 0 <= data["match_score"] <= 100
    # Student has Python and Docker
    assert "Python" in data["matching_skills"]
    assert "Docker" in data["matching_skills"]
    # Student lacks Kubernetes / PostgreSQL
    assert any(s in data["missing_skills"] for s in ["Kubernetes", "PostgreSQL", "System Design"])
    assert len(data["recommendations"]) > 0
    assert len(data["project_ideas"]) > 0
    assert data["is_advisory"] is True

def test_applicant_match_tpo_endpoint(client, student_auth, tpo_token, sample_job):
    """Test TPO viewing candidate advisory match insights."""
    student_token = student_auth["token"]

    # Student applies
    apply_res = client.post(
        "/api/applications",
        json={"job_id": sample_job},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert apply_res.status_code == 201
    app_id = apply_res.json()["id"]

    # TPO fetches applicant insights
    insights_res = client.get(
        f"/api/ai/applicant-match/{app_id}",
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert insights_res.status_code == 200
    data = insights_res.json()
    assert data["company_name"] == "Stripe"
    assert 0 <= data["match_score"] <= 100
    assert "Python" in data["matching_skills"]

def test_ai_unauthorized(client):
    """Anonymous user must be rejected with 401."""
    res = client.post("/api/ai/resume/analyze")
    assert res.status_code == 401
