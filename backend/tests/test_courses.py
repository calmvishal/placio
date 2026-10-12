import pytest
import uuid
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
def student_token():
    uid = uuid.uuid4().hex[:6]
    student_data = {
        "email": f"course_stud_{uid}@college.edu",
        "password": "Password123!",
        "full_name": f"Course Student {uid}",
        "roll_number": f"CST{uid.upper()}",
        "department": "CSE",
        "graduation_year": 2026
    }
    with TestClient(app) as tc:
        reg_res = tc.post("/api/auth/register", json=student_data)
        assert reg_res.status_code == 201
        return reg_res.json()["access_token"]

def test_get_courses_authenticated(student_token):
    with TestClient(app) as tc:
        res = tc.get("/api/courses", headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 200
        courses = res.json()
        assert isinstance(courses, list)
        assert len(courses) >= 10
        codes = [c["code"] for c in courses]
        assert "CSE" in codes
        assert "IT" in codes
        assert "ECE" in codes

def test_tpo_create_course(tpo_token):
    uid = uuid.uuid4().hex[:4].upper()
    code = f"TEST{uid}"
    with TestClient(app) as tc:
        res = tc.post("/api/courses", json={
            "code": code,
            "name": f"Test Engineering Branch {uid}",
            "description": "Specialized branch created by TPO"
        }, headers={"Authorization": f"Bearer {tpo_token}"})
        assert res.status_code == 201
        data = res.json()
        assert data["code"] == code

        # Duplicate should fail with 409
        dup_res = tc.post("/api/courses", json={
            "code": code,
            "name": "Duplicate"
        }, headers={"Authorization": f"Bearer {tpo_token}"})
        assert dup_res.status_code == 409

def test_student_cannot_create_course(student_token):
    with TestClient(app) as tc:
        res = tc.post("/api/courses", json={
            "code": "HACK",
            "name": "Unauthorized Course"
        }, headers={"Authorization": f"Bearer {student_token}"})
        assert res.status_code == 403
