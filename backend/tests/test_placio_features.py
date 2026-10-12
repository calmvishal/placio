import pytest
import io
import uuid
import openpyxl
from fastapi.testclient import TestClient
from app.main import app

def test_bulk_student_import_and_template():
    with TestClient(app) as tc:
        # 1. Login as TPO Super Admin
        admin_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        assert admin_login.status_code == 200
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Download Template
        tpl_res = tc.get("/api/students/bulk-import/template", headers=headers)
        assert tpl_res.status_code == 200
        assert "spreadsheetml.sheet" in tpl_res.headers["content-type"]
        assert len(tpl_res.content) > 100

        # 3. Create a test Excel workbook in memory with 2 new students
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append([
            "Full Name", "Email", "Roll Number", "Department", "Branch",
            "Graduation Year", "CGPA", "10th Percentage", "12th Percentage",
            "Phone", "Password"
        ])
        uid = uuid.uuid4().hex[:6]
        email1 = f"bulk1_{uid}@college.edu"
        email2 = f"bulk2_{uid}@college.edu"
        roll1 = f"BK{uid.upper()}1"
        roll2 = f"BK{uid.upper()}2"

        ws.append(["Aarav Bulk", email1, roll1, "CSE", "Computer Science", 2026, 8.5, 90.0, 88.0, "9876543210", "Placio@2026"])
        ws.append(["Bhavya Bulk", email2, roll2, "IT", "Information Tech", 2026, 9.0, 92.0, 91.0, "9876543211", "Placio@2026"])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)

        # 4. Upload & Bulk Import
        files = {"file": ("students.xlsx", stream.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        imp_res = tc.post("/api/students/bulk-import", files=files, headers=headers)
        assert imp_res.status_code == 200, imp_res.text
        data = imp_res.json()
        assert data["success"] is True
        assert data["imported"] == 2
        assert data["skipped"] == 0

        # 5. Verify the students can log in
        login1 = tc.post("/api/auth/login", json={"email": email1, "password": "Placio@2026"})
        assert login1.status_code == 200
        assert login1.json()["role"] == "student"

        # 6. Verify duplicate import skips gracefully
        stream.seek(0)
        files_dup = {"file": ("students.xlsx", stream.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        dup_res = tc.post("/api/students/bulk-import", files=files_dup, headers=headers)
        assert dup_res.status_code == 200
        dup_data = dup_res.json()
        assert dup_data["imported"] == 0
        assert dup_data["skipped"] == 2

def test_registration_settings_and_domain_restriction():
    with TestClient(app) as tc:
        # 1. Login as TPO Super Admin
        admin_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Settings
        get_res = tc.get("/api/settings/registration")
        assert get_res.status_code == 200
        cfg = get_res.json()
        assert "registration_enabled" in cfg

        # 3. Enable domain restriction to @placio-college.ac.in
        update_res = tc.put("/api/settings/registration", json={
            "registration_enabled": True,
            "domain_restriction_enabled": True,
            "allowed_email_domains": ["placio-college.ac.in"],
            "require_manual_verification": False
        }, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["domain_restriction_enabled"] is True

        try:
            # 4. Attempt to register with unauthorized domain (should fail 400)
            uid = uuid.uuid4().hex[:6]
            unauth_payload = {
                "email": f"hacker_{uid}@gmail.com",
                "password": "Password123!",
                "full_name": "Invalid Domain User"
            }
            fail_reg = tc.post("/api/auth/register", json=unauth_payload)
            assert fail_reg.status_code == 400
            assert "domain" in fail_reg.json()["detail"].lower()

            # 5. Register with authorized domain (should succeed)
            valid_payload = {
                "email": f"valid_{uid}@placio-college.ac.in",
                "password": "Password123!",
                "full_name": "Valid Domain User",
                "roll_number": f"VAL{uid.upper()}",
                "department": "CSE",
                "graduation_year": 2026
            }
            succ_reg = tc.post("/api/auth/register", json=valid_payload)
            assert succ_reg.status_code == 201
        finally:
            # 6. Reset settings back to open domain
            tc.put("/api/settings/registration", json={
                "registration_enabled": True,
                "domain_restriction_enabled": False,
                "allowed_email_domains": ["college.edu"]
            }, headers=headers)

def test_tpo_profile_and_password_update():
    with TestClient(app) as tc:
        # Login
        admin_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Update profile
        prof_res = tc.put("/api/auth/profile", json={"full_name": "Placement Director SuperAdmin"}, headers=headers)
        assert prof_res.status_code == 200
        assert prof_res.json()["full_name"] == "Placement Director SuperAdmin"

        # Change password
        pwd_res = tc.put("/api/auth/change-password", json={
            "current_password": "Admin@12345",
            "new_password": "NewAdminPassword@123"
        }, headers=headers)
        assert pwd_res.status_code == 200

        # Login with new password
        new_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "NewAdminPassword@123"
        })
        assert new_login.status_code == 200

        # Revert password back to Admin@12345 so other tests continue seamlessly
        new_token = new_login.json()["access_token"]
        tc.put("/api/auth/change-password", json={
            "current_password": "NewAdminPassword@123",
            "new_password": "Admin@12345"
        }, headers={"Authorization": f"Bearer {new_token}"})

def test_bulk_application_status_update():
    with TestClient(app) as tc:
        # 1. Login as TPO
        admin_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        token = admin_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Post a test job
        uid = uuid.uuid4().hex[:6]
        job_res = tc.post("/api/jobs", json={
            "company_name": f"BulkCorp {uid}",
            "title": "Software Engineer",
            "salary_package": "12 LPA",
            "job_type": "Full-Time",
            "work_mode": "On-site",
            "location": "Bangalore",
            "description": "Building next-gen systems.",
            "min_cgpa": 6.0,
            "min_tenth_percentage": 60.0,
            "min_twelfth_percentage": 60.0,
            "max_active_backlogs": 0,
            "eligible_batches": [2026],
            "eligible_departments": ["CSE"],
            "application_deadline": "2027-12-31T23:59:59Z"
        }, headers=headers)
        assert job_res.status_code == 201
        job_id = job_res.json()["id"]

        # 3. Register two students and apply
        app_ids = []
        for i in range(2):
            s_uid = uuid.uuid4().hex[:6]
            st_res = tc.post("/api/auth/register", json={
                "email": f"applicant_{s_uid}@college.edu",
                "password": "Password123!",
                "full_name": f"Candidate {s_uid}",
                "roll_number": f"APP{s_uid.upper()}",
                "department": "CSE",
                "graduation_year": 2026
            })
            assert st_res.status_code == 201
            st_token = st_res.json()["access_token"]
            st_headers = {"Authorization": f"Bearer {st_token}"}
            
            # Update academic profile to meet job eligibility (CGPA >= 6.0)
            tc.put("/api/students/profile", json={
                "cgpa": 8.5,
                "tenth_percentage": 85.0,
                "twelfth_percentage": 85.0,
                "active_backlogs": 0,
                "department": "CSE",
                "graduation_year": 2026
            }, headers=st_headers)

            # Apply to job
            apply_res = tc.post("/api/applications", json={"job_id": job_id}, headers=st_headers)
            assert apply_res.status_code == 201
            app_ids.append(apply_res.json()["id"])

        # 4. Bulk update to "Shortlisted"
        bulk_res = tc.post("/api/applications/bulk-status", json={
            "application_ids": app_ids,
            "status": "Shortlisted",
            "notes": "Shortlisted based on screening"
        }, headers=headers)
        assert bulk_res.status_code == 200
        data = bulk_res.json()
        assert data["success"] is True
        assert data["updated_count"] == 2
        assert data["target_status"] == "Shortlisted"

        # 5. Bulk schedule interview
        sched_res = tc.post("/api/applications/bulk-status", json={
            "application_ids": app_ids,
            "status": "Interview Scheduled",
            "interview_date": "2026-10-25T10:00:00Z",
            "interview_round": "Technical Round 1",
            "interview_mode": "Online",
            "interview_venue_or_link": "https://meet.google.com/bulk-interview-test"
        }, headers=headers)
        assert sched_res.status_code == 200
        assert sched_res.json()["updated_count"] == 2

