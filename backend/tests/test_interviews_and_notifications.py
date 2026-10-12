import uuid
import pytest
from datetime import datetime, timezone, timedelta
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

@pytest.fixture
def student_auth(client):
    uid = uuid.uuid4().hex[:6]
    data = {
        "email": f"interview_student_{uid}@college.edu",
        "password": "Password123!",
        "full_name": f"Interview Student {uid}",
        "roll_number": f"INT{uid.upper()}",
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
            "cgpa": 8.9,
            "tenth_percentage": 91.0,
            "twelfth_percentage": 89.0,
            "active_backlogs": 0,
            "department": "CSE",
            "graduation_year": 2026,
            "skills": ["Python", "Algorithms", "System Design"],
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    return {"token": token, "email": data["email"], "user_id": user_id}

@pytest.fixture
def published_job(client, tpo_token):
    job_payload = {
        "company_name": "Atlassian",
        "title": "Software Engineer (Backend)",
        "description": "Distributed systems engineering",
        "job_type": "Full-Time",
        "required_branches": ["CSE", "IT"],
        "min_cgpa": 7.5,
        "graduation_year": 2026,
        "max_active_backlogs": 0,
        "required_skills": ["Java", "Distributed Systems"],
        "location": "Bengaluru",
        "work_mode": "Hybrid",
        "salary_package": "22 LPA",
        "application_deadline": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(),
        "status": "published",
    }
    res = client.post(
        "/api/jobs",
        json=job_payload,
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert res.status_code == 201
    return res.json()["id"]

def test_notifications_lifecycle(client, student_auth, tpo_token, published_job):
    """Test receiving, listing, reading, and clearing in-app notifications."""
    token = student_auth["token"]

    # 1. Apply to a job (triggers initial notification)
    apply_res = client.post(
        "/api/applications",
        json={"job_id": published_job},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert apply_res.status_code == 201
    app_id = apply_res.json()["id"]

    # 2. TPO updates status to Shortlisted (triggers status notification)
    tpo_update = client.put(
        f"/api/applications/{app_id}/status",
        json={"status": "Shortlisted", "notes": "Resume cleared screening."},
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert tpo_update.status_code == 200

    # 3. Student fetches notifications
    notif_res = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert notif_res.status_code == 200
    data = notif_res.json()
    assert data["total_count"] >= 1
    assert data["unread_count"] >= 1
    notifications = data["notifications"]
    first_notif = notifications[0]

    # 4. Mark single notification as read
    read_res = client.put(
        f"/api/notifications/{first_notif['id']}/read",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert read_res.status_code == 200
    assert read_res.json()["read"] is True

    # 5. Mark all as read
    mark_all = client.put(
        "/api/notifications/mark-all-read",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert mark_all.status_code == 200

    # 6. Verify unread count is now 0
    refreshed = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert refreshed.json()["unread_count"] == 0

    # 7. Delete notification
    del_res = client.delete(
        f"/api/notifications/{first_notif['id']}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert del_res.status_code == 200

def test_interview_scheduling_and_outcomes(client, student_auth, tpo_token, published_job):
    """Full workflow: TPO schedules interview, student views it, TPO updates outcome."""
    student_token = student_auth["token"]
    student_id = student_auth["user_id"]

    # 1. Student applies
    client.post(
        "/api/applications",
        json={"job_id": published_job},
        headers={"Authorization": f"Bearer {student_token}"},
    )

    # 2. Student cannot schedule interviews (403)
    interview_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    forbidden_res = client.post(
        "/api/interviews/schedule",
        json={
            "job_id": published_job,
            "student_ids": [student_id],
            "round_name": "Technical Round 1",
            "scheduled_at": interview_time,
            "mode": "Online",
            "venue_or_link": "https://meet.google.com/abc-defg-hij",
            "instructions": "Be ready with code editor and webcam enabled.",
            "advance_stage": True,
        },
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert forbidden_res.status_code == 403

    # 3. TPO schedules interview
    schedule_res = client.post(
        "/api/interviews/schedule",
        json={
            "job_id": published_job,
            "student_ids": [student_id],
            "round_name": "Technical Round 1",
            "scheduled_at": interview_time,
            "mode": "Online",
            "venue_or_link": "https://meet.google.com/abc-defg-hij",
            "instructions": "Be ready with code editor and webcam enabled.",
            "advance_stage": True,
        },
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert schedule_res.status_code == 201
    created_interviews = schedule_res.json()
    assert len(created_interviews) == 1
    interview_id = created_interviews[0]["id"]
    assert created_interviews[0]["company_name"] == "Atlassian"
    assert created_interviews[0]["round_name"] == "Technical Round 1"

    # 4. Verify student's application was advanced to 'Interview Scheduled'
    my_apps = client.get(
        "/api/applications/my",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    matching_app = next(a for a in my_apps.json() if a["job_id"] == published_job)
    assert matching_app["status"] == "Interview Scheduled"

    # 5. Student views their scheduled interviews
    student_interviews = client.get(
        "/api/interviews/my",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_interviews.status_code == 200
    assert len(student_interviews.json()) >= 1
    assert student_interviews.json()[0]["venue_or_link"] == "https://meet.google.com/abc-defg-hij"

    # 6. Verify scheduling with student profile ID (as passed by frontend applicants table) succeeds
    profile_sched = client.post(
        "/api/interviews/schedule",
        json={
            "job_id": published_job,
            "student_ids": [matching_app["student_id"]],
            "round_name": "Technical Round 2",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat(),
            "mode": "Online",
            "venue_or_link": "https://meet.google.com/round-2-abc",
            "instructions": "System design round",
            "advance_stage": True,
        },
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert profile_sched.status_code == 201
    assert profile_sched.json()[0]["round_name"] == "Technical Round 2"

    # 7. TPO updates interview outcome to 'Cleared' and advances application to 'Selected'
    outcome_res = client.put(
        f"/api/interviews/{interview_id}/outcome",
        json={
            "outcome": "Cleared",
            "outcome_notes": "Candidate demonstrated excellent problem solving and clean code.",
            "update_application_status": "Selected",
        },
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert outcome_res.status_code == 200
    assert outcome_res.json()["outcome"] == "Cleared"

    # 7. Verify student's application status is now 'Selected'
    my_apps_after = client.get(
        "/api/applications/my",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    updated_app = next(a for a in my_apps_after.json() if a["job_id"] == published_job)
    assert updated_app["status"] == "Selected"

    # 8. Verify student received notification about interview outcome
    notifs = client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert any("Cleared" in n["title"] or "Cleared" in n["message"] for n in notifs.json()["notifications"])

def test_email_configuration_and_mock_dispatch(client, tpo_token):
    """Test getting email service configuration status and sending test notification email."""
    # 1. TPO gets email config
    res = client.get(
        "/api/notifications/email-config",
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert res.status_code == 200
    config_data = res.json()
    assert "smtp_enabled" in config_data
    assert "mode" in config_data

    # 2. TPO dispatches a test email
    test_res = client.post(
        "/api/notifications/test-email",
        json={"recipient_email": "test_student@college.edu"},
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert test_res.status_code == 200
    assert "result" in test_res.json()
    assert test_res.json()["result"]["status"] in ["mock_delivered", "sent"]

def test_interview_reminder_endpoints(client, tpo_token, student_auth, published_job):
    """Test single candidate reminder and bulk reminders dispatch."""
    student_token = student_auth["token"]
    student_user_id = student_auth["user_id"]

    # 1. Apply for job
    app_res = client.post(
        "/api/applications",
        json={"job_id": published_job},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert app_res.status_code == 201

    # 2. Schedule interview
    sched_res = client.post(
        "/api/interviews/schedule",
        json={
            "job_id": published_job,
            "student_ids": [student_user_id],
            "round_name": "Technical Assessment",
            "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "mode": "Online",
            "venue_or_link": "https://meet.google.com/remind-test",
            "instructions": "Prepare DSA problems",
            "advance_stage": True,
        },
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert sched_res.status_code == 201
    interview_id = sched_res.json()[0]["id"]

    # 3. Test single candidate reminder
    remind_res = client.post(
        f"/api/interviews/{interview_id}/remind",
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert remind_res.status_code == 200
    assert remind_res.json()["success"] is True

    # 4. Test bulk remind all
    bulk_res = client.post(
        "/api/interviews/remind-all",
        headers={"Authorization": f"Bearer {tpo_token}"},
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["success"] is True
    assert bulk_res.json()["reminded_count"] >= 1

