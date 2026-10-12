import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app

def test_tpo_staff_full_lifecycle():
    with TestClient(app) as tc:
        # 1. Login as TPO Super Admin
        admin_login = tc.post("/api/auth/login", json={
            "email": "admin@tpo.college.edu",
            "password": "Admin@12345"
        })
        assert admin_login.status_code == 200, admin_login.text
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        super_admin_id = admin_login.json()["user_id"]

        # 2. Get Permissions Catalog
        perm_res = tc.get("/api/staff/permissions", headers=admin_headers)
        assert perm_res.status_code == 200
        perm_list = perm_res.json()
        assert len(perm_list) >= 5
        perm_ids = [p["id"] for p in perm_list]
        assert "manage_drives" in perm_ids
        assert "schedule_interviews" in perm_ids

        # 3. List initial staff
        list_res = tc.get("/api/staff", headers=admin_headers)
        assert list_res.status_code == 200
        staff_list = list_res.json()
        assert len(staff_list) >= 1
        assert any(s["email"] == "admin@tpo.college.edu" for s in staff_list)

        # 4. Add a new TPO Staff member
        uid = uuid.uuid4().hex[:6]
        staff_email = f"officer_{uid}@tpo.college.edu"
        staff_payload = {
            "email": staff_email,
            "password": "InitialStaffPass123!",
            "full_name": f"Officer {uid.upper()}",
            "role": "tpo_staff",
            "designation": "Assistant Placement Officer",
            "permissions": ["manage_drives", "schedule_interviews"]
        }
        create_res = tc.post("/api/staff", json=staff_payload, headers=admin_headers)
        assert create_res.status_code == 201, create_res.text
        created_staff = create_res.json()
        assert created_staff["email"] == staff_email
        assert created_staff["designation"] == "Assistant Placement Officer"
        assert created_staff["role"] == "tpo_staff"
        assert set(created_staff["permissions"]) == {"manage_drives", "schedule_interviews"}
        new_staff_id = created_staff["id"]

        # 5. Verify the new staff can log in
        staff_login = tc.post("/api/auth/login", json={
            "email": staff_email,
            "password": "InitialStaffPass123!"
        })
        assert staff_login.status_code == 200
        staff_token = staff_login.json()["access_token"]
        assert staff_login.json()["role"] == "tpo_staff"
        assert staff_login.json()["designation"] == "Assistant Placement Officer"

        # 6. Verify non-super-admin (tpo_staff) cannot access /api/staff management
        forbidden_res = tc.get("/api/staff", headers={"Authorization": f"Bearer {staff_token}"})
        assert forbidden_res.status_code == 403

        # 7. Search staff by name/email/designation
        search_res = tc.get(f"/api/staff?search={uid}", headers=admin_headers)
        assert search_res.status_code == 200
        assert len(search_res.json()) >= 1
        assert search_res.json()[0]["id"] == new_staff_id

        # 8. Update Designation and Permissions
        update_payload = {
            "designation": "Senior Corporate Relations Lead",
            "permissions": ["manage_drives", "schedule_interviews", "manage_students", "export_data"]
        }
        access_res = tc.put(f"/api/staff/{new_staff_id}/access", json=update_payload, headers=admin_headers)
        assert access_res.status_code == 200
        updated_data = access_res.json()
        assert updated_data["designation"] == "Senior Corporate Relations Lead"
        assert len(updated_data["permissions"]) == 4

        # 9. Change Password
        new_pwd = "UpdatedSecretPass456!"
        pwd_res = tc.put(f"/api/staff/{new_staff_id}/password", json={"new_password": new_pwd}, headers=admin_headers)
        assert pwd_res.status_code == 200

        # Verify old password fails
        old_login = tc.post("/api/auth/login", json={"email": staff_email, "password": "InitialStaffPass123!"})
        assert old_login.status_code == 401

        # Verify new password succeeds
        new_login = tc.post("/api/auth/login", json={"email": staff_email, "password": new_pwd})
        assert new_login.status_code == 200

        # 10. Deactivate Staff Account
        deactivate_res = tc.put(f"/api/staff/{new_staff_id}/status", json={"is_active": False}, headers=admin_headers)
        assert deactivate_res.status_code == 200

        # Verify deactivated login is immediately blocked
        blocked_login = tc.post("/api/auth/login", json={"email": staff_email, "password": new_pwd})
        assert blocked_login.status_code == 403
        assert "deactivated" in blocked_login.json()["detail"].lower()

        # 11. Reactivate Staff Account
        reactivate_res = tc.put(f"/api/staff/{new_staff_id}/status", json={"is_active": True}, headers=admin_headers)
        assert reactivate_res.status_code == 200

        relogin = tc.post("/api/auth/login", json={"email": staff_email, "password": new_pwd})
        assert relogin.status_code == 200

        # 12. Prevent Super Admin self-deactivation and self-deletion
        self_deact = tc.put(f"/api/staff/{super_admin_id}/status", json={"is_active": False}, headers=admin_headers)
        assert self_deact.status_code == 400
        assert "cannot deactivate" in self_deact.json()["detail"].lower()

        self_del = tc.delete(f"/api/staff/{super_admin_id}", headers=admin_headers)
        assert self_del.status_code == 400
        assert "cannot delete" in self_del.json()["detail"].lower()

        # 13. Remove Staff Member
        delete_res = tc.delete(f"/api/staff/{new_staff_id}", headers=admin_headers)
        assert delete_res.status_code == 200

        # Verify removed user is gone
        gone_login = tc.post("/api/auth/login", json={"email": staff_email, "password": new_pwd})
        assert gone_login.status_code == 401
