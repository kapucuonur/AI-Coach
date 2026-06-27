import pytest
from datetime import timedelta
from backend.auth_utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    encrypt_garmin_password,
    decrypt_garmin_password,
    is_user_premium
)
from backend.models import User

def test_password_hashing():
    password = "supersecretpassword"
    hashed = get_password_hash(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_creation():
    data = {"sub": "test@coachonurai.com"}
    token = create_access_token(data, expires_delta=timedelta(minutes=15))
    
    assert isinstance(token, str)
    assert len(token) > 20

def test_fernet_garmin_encryption():
    plain_password = "myGarminPassword123"
    encrypted = encrypt_garmin_password(plain_password)
    
    assert encrypted != plain_password
    assert decrypt_garmin_password(encrypted) == plain_password

def test_garmin_encryption_fallback():
    # If the password in DB isn't encrypted (legacy), it should return the plaintext
    legacy_password = "oldPlaintextPassword55"
    decrypted = decrypt_garmin_password(legacy_password)
    assert decrypted == legacy_password

def test_is_user_premium_logic():
    # Trial user (simulated by recently created account)
    from datetime import datetime
    
    # 1. Premium user
    premium_user = User(is_premium=True, created_at=datetime.utcnow() - timedelta(days=10))
    assert is_user_premium(premium_user) is True
    
    # 2. Free Trial User (created less than 7 days ago, but not premium flag)
    trial_user = User(is_premium=False, created_at=datetime.utcnow() - timedelta(days=2))
    assert is_user_premium(trial_user) is True
    
    # 3. Expired Free User (created > 7 days ago and not premium)
    expired_user = User(is_premium=False, created_at=datetime.utcnow() - timedelta(days=8))
    assert is_user_premium(expired_user) is False

def test_auth_login_endpoint(client, test_user):
    """Test the OAuth2 token endpoint using valid credentials."""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@coachonurai.com", "password": "testpassword123"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"

def test_auth_login_invalid_credentials(client, test_user):
    """Test login failure with a wrong password."""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@coachonurai.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"

def test_get_current_user_endpoint(client, test_user_token, test_user):
    """Test that a valid JWT token can retrieve the user profile."""
    # Using the /api/settings endpoint which depends on get_current_user
    response = client.get(
        "/api/settings",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == 200
    
def test_get_current_user_invalid_token(client):
    """Test accessing protected route with a bad token."""
    response = client.get(
        "/api/settings",
        headers={"Authorization": "Bearer invalid.token.string"}
    )
    assert response.status_code == 401
