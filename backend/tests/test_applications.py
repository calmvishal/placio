import pytest
import uuid
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def tpo_auth():
    with TestClient(app) as tc:
        res = tc.post("/api/auth/login", json={"email": "admin@tpo.college.edu", "password": "Admin@12345"})
        assert res.status_code == 200
        return res.json()["access_token"]

@pytest.fixture
def eligible_student():
    uid = uuid.uuid4().hex[:6]
    data = {
        "email": f"app_student_{uid}@college.edu",
        "password": "Password123!",
        "full_name": f"App Test Student {uid}",
        "roll_number": f"APP{uid.upper()}",
        "department": "CSE",
        "graduation_year": 2026,
    }
    with TestClient(app) as tc:
        reg = tc.post("/api/auth/register", json=data)
        assert reg.status_code == 201
        token = reg.json()["access_token"]

        tc.put("/api/students/profile", json={
            "cgpa": 8.8,
            "tenth_percentage": 92.0,
            "twelfth_percentage": 90.0,
            "active_backlogs": 0,
            "department": "CSE",
            "graduation_year": 2026,
            "skills": ["Python", "FastAPI"],
        }, headers={"Authorization": f"Bearer {token}"})

        return {"token": token, "email": data["email"]}

@pytest.fixture
def published_job(tpo_auth):
    with TestClient(app) as tc:
        deadline = datetime.now(timezone.utc) + timedelta(days=10)
        res = tc.post("/api/jobs", json={
            "company_name": "Amazon AWS",
            "title": "Cloud Support Associate",
            "description": "Provide high-scale cloud architectural support.",
            "job_type": "Full-Time",
            "required_branches": ["CSE", "IT"],
            "min_cgpa": 7.0,
            "graduation_year": 2026,
            "max_active_backlogs": 0,
            "salary_package": "14.0 LPA",
            "application_deadline": deadline.isoformat(),
            "status": "published",
        }, headers={"Authorization": f"Bearer {tpo_auth}"})
        assert res.status_code == 201
        return res.json()["id"]

def test_eligible_student_apply_success(eligible_student, published_job):
    with TestClient(app) as tc:
        res = tc.post(
            "/api/applications",
            json={"job_id": published_job},
            headers={"Authorization": f"Bearer {eligible_student['token']}"}
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "Applied"
        assert data["company_name"] == "Amazon AWS"
        assert data["student_snapshot"]["cgpa"] == 8.8
        assert len(data["status_history"]) == 1

def test_duplicate_application_fails(eligible_student, published_job):
    with TestClient(app) as tc:
        # First application
        tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})

        # Second attempt
        res2 = tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})
        assert res2.status_code == 400
        assert "already submitted an application" in res2.json()["detail"]

def test_ineligible_student_cannot_apply(tpo_auth, eligible_student, published_job):
    with TestClient(app) as tc:
        # Lower CGPA to 5.5 (job requires 7.0)
        tc.put("/api/students/profile", json={"cgpa": 5.5}, headers={"Authorization": f"Bearer {eligible_student['token']}"})

        res = tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})
        assert res.status_code == 400
        assert "Eligibility criteria not satisfied" in res.json()["detail"]

def test_get_my_applications(eligible_student, published_job):
    with TestClient(app) as tc:
        # Apply
        tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})

        # List
        res = tc.get("/api/applications/my", headers={"Authorization": f"Bearer {eligible_student['token']}"})
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert data[0]["company_name"] == "Amazon AWS"

def test_tpo_view_and_transition_applicant_status(tpo_auth, eligible_student, published_job):
    with TestClient(app) as tc:
        # Student applies
        app_res = tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})
        app_id = app_res.json()["id"]

        # TPO views applicants
        list_res = tc.get(f"/api/applications/job/{published_job}", headers={"Authorization": f"Bearer {tpo_auth}"})
        assert list_res.status_code == 200
        assert len(list_res.json()) >= 1

        # TPO transitions status to Shortlisted
        trans_res = tc.put(
            f"/api/applications/{app_id}/status",
            json={"status": "Shortlisted", "notes": "Qualified Round 1 Assessment"},
            headers={"Authorization": f"Bearer {tpo_auth}"}
        )
        assert trans_res.status_code == 200
        data = trans_res.json()
        assert data["status"] == "Shortlisted"
        assert len(data["status_history"]) == 2
        assert data["status_history"][-1]["notes"] == "Qualified Round 1 Assessment"

def test_student_cannot_transition_status(eligible_student, published_job):
    with TestClient(app) as tc:
        app_res = tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})
        app_id = app_res.json()["id"]

        # Student tries to promote themselves to Selected
        res = tc.put(
            f"/api/applications/{app_id}/status",
            json={"status": "Selected", "notes": "Hacked"},
            headers={"Authorization": f"Bearer {eligible_student['token']}"}
        )
        assert res.status_code == 403
        assert "Access forbidden" in res.json()["detail"]

def test_student_withdraw_application(eligible_student, published_job):
    with TestClient(app) as tc:
        app_res = tc.post("/api/applications", json={"job_id": published_job}, headers={"Authorization": f"Bearer {eligible_student['token']}"})
        app_id = app_res.json()["id"]

        withdraw_res = tc.post(f"/api/applications/{app_id}/withdraw", headers={"Authorization": f"Bearer {eligible_student['token']}"})
        assert withdraw_res.status_code == 200
        assert withdraw_res.json()["status"] == "Withdrawn"
