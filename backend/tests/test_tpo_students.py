import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app

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

def test_tpo_student_management_lifecycle(client, tpo_token):
    uid = uuid.uuid4().hex[:6]
    student_email = f"student_mgmt_{uid}@college.edu"
    initial_password = "Password123!"
    roll = f"TEST{uid.upper()}"

    # 1. TPO adds a new student
    create_payload = {
        "full_name": f"Managed Student {uid}",
        "email": student_email,
        "password": initial_password,
        "roll_number": roll,
        "department": "CSE",
        "branch": "Computer Science & Engineering",
        "graduation_year": 2026,
        "cgpa": 8.7,
        "phone": "+91 9999988888",
    }
    create_res = client.post(
        "/api/students",
        json=create_payload,
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert create_res.status_code == 201
    created_student = create_res.json()
    user_id = created_student["user_id"]
    assert created_student["email"] == student_email
    assert created_student["roll_number"] == roll
    assert created_student["is_active"] is True

    # 2. Student can login with initial password
    login_1 = client.post("/api/auth/login", json={
        "email": student_email,
        "password": initial_password
    })
    assert login_1.status_code == 200

    # 3. TPO lists students with search filter
    list_res = client.get(
        f"/api/students/all?search={roll}",
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert list_res.status_code == 200
    results = list_res.json()
    assert len(results) >= 1
    assert any(s["user_id"] == user_id for s in results)

    # 4. TPO deactivates the student
    deact_res = client.put(
        f"/api/students/{user_id}/status",
        json={"is_active": False, "reason": "Academic probation"},
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # 5. Deactivated student cannot login (HTTP 403 Forbidden)
    login_deact = client.post("/api/auth/login", json={
        "email": student_email,
        "password": initial_password
    })
    assert login_deact.status_code == 403

    # 6. TPO changes the student's password
    new_password = "NewStrongPassword789!"
    pwd_res = client.put(
        f"/api/students/{user_id}/password",
        json={"new_password": new_password},
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert pwd_res.status_code == 200
    assert pwd_res.json()["success"] is True

    # 7. TPO reactivates the student
    react_res = client.put(
        f"/api/students/{user_id}/status",
        json={"is_active": True},
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert react_res.status_code == 200
    assert react_res.json()["is_active"] is True

    # 8. Student logs in with the new password
    login_new = client.post("/api/auth/login", json={
        "email": student_email,
        "password": new_password
    })
    assert login_new.status_code == 200
