from fastapi.testclient import TestClient
from app.main import app
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

def test_read_root():
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "version" in data

def test_health_check_includes_database():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["project"] == "AI-Assisted Placement & Training Portal"
        assert "database" in data
        assert isinstance(data["database"]["connected"], bool)

def test_password_hashing_and_verification():
    raw_pwd = "MySecretPassword123!"
    hashed = get_password_hash(raw_pwd)
    assert hashed != raw_pwd
    assert hashed.startswith("$2b$")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_generation_and_decode():
    email = "student@college.edu"
    role = "student"
    user_id = "67087e59b2e0431bfa3c6789"
    token = create_access_token(subject=email, role=role, user_id=user_id)
    assert isinstance(token, str)
    
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == email
    assert payload["role"] == role
    assert payload["user_id"] == user_id
