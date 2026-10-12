import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def unique_student():
    unique_id = uuid.uuid4().hex[:6]
    return {
        "email": f"student_{unique_id}@college.edu",
        "password": "Password123!",
        "full_name": f"Test Student {unique_id}",
        "roll_number": f"CS{unique_id.upper()}",
        "department": "CSE",
        "graduation_year": 2026
    }

def test_student_registration_success(unique_student):
    with TestClient(app) as tc:
        response = tc.post("/api/auth/register", json=unique_student)
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "student"
        assert data["email"] == unique_student["email"].lower()
        assert data["full_name"] == unique_student["full_name"]

def test_duplicate_email_registration_fails(unique_student):
    with TestClient(app) as tc:
        # First registration
        r1 = tc.post("/api/auth/register", json=unique_student)
        assert r1.status_code == 201

        # Second registration with same email
        r2 = tc.post("/api/auth/register", json=unique_student)
        assert r2.status_code == 400
        assert "already exists" in r2.json()["detail"]

def test_student_login_success(unique_student):
    with TestClient(app) as tc:
        # Register student
        tc.post("/api/auth/register", json=unique_student)

        # Login
        login_payload = {
            "email": unique_student["email"],
            "password": unique_student["password"]
        }
        response = tc.post("/api/auth/login", json=login_payload)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["role"] == "student"

def test_login_invalid_password(unique_student):
    with TestClient(app) as tc:
        tc.post("/api/auth/register", json=unique_student)
        response = tc.post("/api/auth/login", json={
            "email": unique_student["email"],
            "password": "WrongPassword!"
        })
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

def test_login_tpo_admin_seeded_account():
    with TestClient(app) as tc:
        response = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "tpo_admin"
        assert data["email"] == "admin@tpo.college.edu"

def test_get_me_unauthorized_without_token():
    with TestClient(app) as tc:
        response = tc.get("/api/auth/me")
        assert response.status_code == 401

def test_get_me_authorized_with_token(unique_student):
    with TestClient(app) as tc:
        reg_res = tc.post("/api/auth/register", json=unique_student)
        token = reg_res.json()["access_token"]

        response = tc.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == unique_student["email"].lower()
        assert data["role"] == "student"
        assert data["full_name"] == unique_student["full_name"]
