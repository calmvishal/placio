import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.api.analytics import parse_ctc_in_lpa

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
def student_token():
    uid = uuid.uuid4().hex[:6]
    student_data = {
        "email": f"analytics_stud_{uid}@college.edu",
        "password": "Password123!",
        "full_name": f"Analytics Student {uid}",
        "roll_number": f"AST{uid.upper()}",
        "department": "CSE",
        "graduation_year": 2026
    }
    with TestClient(app) as tc:
        reg_res = tc.post("/api/auth/register", json=student_data)
        assert reg_res.status_code == 201
        token = reg_res.json()["access_token"]

        tc.put("/api/students/profile", json={
            "cgpa": 8.75,
            "tenth_percentage": 92.0,
            "twelfth_percentage": 90.0,
            "active_backlogs": 0,
            "department": "CSE",
            "graduation_year": 2026,
            "skills": ["React", "FastAPI", "MongoDB"]
        }, headers={"Authorization": f"Bearer {token}"})

        return token

def test_parse_ctc_in_lpa():
    assert parse_ctc_in_lpa("12 LPA") == 12.0
    assert parse_ctc_in_lpa("8.5 LPA") == 8.5
    assert parse_ctc_in_lpa("6 - 15 LPA") == 15.0
    assert parse_ctc_in_lpa("₹10,00,000") == 10.0
    assert parse_ctc_in_lpa("1400000") == 14.0
    assert parse_ctc_in_lpa("Competitive Salary") is None
    assert parse_ctc_in_lpa("") is None
    assert parse_ctc_in_lpa(None) is None

def test_tpo_analytics_overview_authorized(tpo_token):
    with TestClient(app) as tc:
        res = tc.get("/api/analytics/overview", headers={"Authorization": f"Bearer {tpo_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "total_students" in data
        assert "total_jobs" in data
        assert "active_jobs" in data
        assert "total_applications" in data
        assert "total_placed" in data
        assert "placement_rate_percent" in data
        assert "highest_ctc_lpa" in data
        assert "average_ctc_lpa" in data
        assert "funnel" in data
        assert isinstance(data["funnel"], list)
        assert len(data["funnel"]) == 8  # all standard stages
        assert "department_stats" in data
        assert isinstance(data["department_stats"], list)
        assert "status_distribution" in data
        assert isinstance(data["status_distribution"], dict)

def test_student_cannot_access_tpo_analytics_overview(student_token):
    with TestClient(app) as tc:
        res = tc.get("/api/analytics/overview", headers={"Authorization": f"Bearer {student_token}"})
        # Should be forbidden for ordinary student accounts
        assert res.status_code == 403

def test_student_analytics_summary_authorized(student_token):
    with TestClient(app) as tc:
        res = tc.get("/api/analytics/student-summary", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        data = res.json()
        assert "total_applied" in data
        assert "shortlisted_count" in data
        assert "selected_count" in data
        assert "profile_completion" in data
        assert "funnel_breakdown" in data
        assert isinstance(data["funnel_breakdown"], list)
