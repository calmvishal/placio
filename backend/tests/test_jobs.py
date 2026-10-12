import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def tpo_token():
    with TestClient(app) as tc:
        res = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        assert res.status_code == 200
        return res.json()["access_token"]

@pytest.fixture
def eligible_student_token():
    unique_id = uuid.uuid4().hex[:6]
    student_data = {
        "email": f"elig_{unique_id}@college.edu",
        "password": "Password123!",
        "full_name": f"Eligible Student {unique_id}",
        "roll_number": f"ELG{unique_id.upper()}",
        "department": "CSE",
        "graduation_year": 2026
    }
    with TestClient(app) as tc:
        reg_res = tc.post("/api/auth/register", json=student_data)
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]

        # Setup eligible profile
        tc.put("/api/students/profile", json={
            "cgpa": 8.50,
            "tenth_percentage": 90.0,
            "twelfth_percentage": 88.0,
            "active_backlogs": 0,
            "department": "CSE",
            "graduation_year": 2026
        }, headers={"Authorization": f"Bearer {token}"})

        return token

@pytest.fixture
def sample_job_payload():
    deadline = datetime.now(timezone.utc) + timedelta(days=14)
    return {
        "company_name": "Google India",
        "title": "Software Development Engineer",
        "description": "Develop scalable distributed cloud backend services.",
        "job_type": "Full-Time",
        "required_branches": ["CSE", "IT"],
        "min_cgpa": 7.5,
        "graduation_year": 2026,
        "max_active_backlogs": 0,
        "required_skills": ["Python", "DSA", "Distributed Systems"],
        "location": "Bangalore",
        "work_mode": "Hybrid",
        "salary_package": "24.5 LPA",
        "application_deadline": deadline.isoformat(),
        "status": "published"
    }

def test_tpo_create_job_success(tpo_token, sample_job_payload):
    with TestClient(app) as tc:
        res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {tpo_token}"})
        assert res.status_code == 201
        data = res.json()
        assert data["company_name"] == "Google India"
        assert data["min_cgpa"] == 7.5
        assert "id" in data

def test_student_forbidden_from_creating_job(eligible_student_token, sample_job_payload):
    with TestClient(app) as tc:
        res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {eligible_student_token}"})
        assert res.status_code == 403
        assert "Access forbidden" in res.json()["detail"]

def test_student_eligibility_evaluation_eligible(tpo_token, eligible_student_token, sample_job_payload):
    with TestClient(app) as tc:
        # 1. TPO creates job
        job_res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {tpo_token}"})
        job_id = job_res.json()["id"]

        # 2. Student views job
        res = tc.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {eligible_student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["is_eligible"] is True
        assert data["can_apply"] is True
        assert data["deadline_passed"] is False

        # Verify criteria list contains all passed
        assert all(c["passed"] for c in data["eligibility_criteria"])

def test_student_eligibility_fails_on_low_cgpa(tpo_token, eligible_student_token, sample_job_payload):
    with TestClient(app) as tc:
        # Create job with 8.0 CGPA
        sample_job_payload["min_cgpa"] = 8.0
        job_res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {tpo_token}"})
        job_id = job_res.json()["id"]

        # Student updates CGPA to 6.5
        tc.put("/api/students/profile", json={"cgpa": 6.5}, headers={"Authorization": f"Bearer {eligible_student_token}"})

        # Student views job
        res = tc.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {eligible_student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["is_eligible"] is False
        assert data["can_apply"] is False

        # Find CGPA rule failure
        cgpa_rule = next(c for c in data["eligibility_criteria"] if c["rule"] == "Minimum CGPA")
        assert cgpa_rule["passed"] is False
        assert "below minimum requirement" in cgpa_rule["message"]

def test_student_eligibility_fails_on_active_backlogs(tpo_token, eligible_student_token, sample_job_payload):
    with TestClient(app) as tc:
        job_res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {tpo_token}"})
        job_id = job_res.json()["id"]

        # Student has 2 active backlogs
        tc.put("/api/students/profile", json={"cgpa": 8.5, "active_backlogs": 2}, headers={"Authorization": f"Bearer {eligible_student_token}"})

        res = tc.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {eligible_student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["is_eligible"] is False

        backlog_rule = next(c for c in data["eligibility_criteria"] if c["rule"] == "Active Backlogs Policy")
        assert backlog_rule["passed"] is False
        assert "exceeds maximum allowed" in backlog_rule["message"]

def test_student_eligibility_fails_on_department(tpo_token, eligible_student_token, sample_job_payload):
    with TestClient(app) as tc:
        sample_job_payload["required_branches"] = ["ECE", "EEE"]
        job_res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {tpo_token}"})
        job_id = job_res.json()["id"]

        # Student is in CSE
        tc.put("/api/students/profile", json={"department": "CSE", "cgpa": 9.0, "active_backlogs": 0}, headers={"Authorization": f"Bearer {eligible_student_token}"})

        res = tc.get(f"/api/jobs/{job_id}", headers={"Authorization": f"Bearer {eligible_student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["is_eligible"] is False

        dept_rule = next(c for c in data["eligibility_criteria"] if c["rule"] == "Department / Branch")
        assert dept_rule["passed"] is False
        assert "not in allowed branches" in dept_rule["message"]

def test_tpo_update_job_status_to_closed(tpo_token, sample_job_payload):
    with TestClient(app) as tc:
        job_res = tc.post("/api/jobs", json=sample_job_payload, headers={"Authorization": f"Bearer {tpo_token}"})
        job_id = job_res.json()["id"]

        update_res = tc.put(f"/api/jobs/{job_id}", json={"status": "closed"}, headers={"Authorization": f"Bearer {tpo_token}"})
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "closed"
