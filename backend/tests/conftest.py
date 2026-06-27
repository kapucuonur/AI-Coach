import os
import pytest
from cryptography.fernet import Fernet

# Must be set BEFORE importing any backend modules that depend on them
os.environ["JWT_SECRET_KEY"] = "test_super_secret_jwt_key"
os.environ["FIELD_ENCRYPT_KEY"] = Fernet.generate_key().decode()
os.environ["GEMINI_API_KEY"] = "test_gemini_api_key_mock"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_mock"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_mock"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app
from backend.database import Base, get_db
from backend.models import User
from backend.routers.auth import limiter

# Disable rate limiting for tests
limiter.enabled = False

# In-memory SQLite for blazing fast, isolated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    """Creates a fresh database session for a single test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    """
    Returns a FastAPI TestClient configured to use the in-memory SQLite database.
    This overrides the `get_db` dependency.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Context manager triggers startup/shutdown lifespan events (like setting up app.state.brain)
    with TestClient(app) as c:
        yield c
    # Clean up overrides
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db_session):
    """Creates a default test user inside the test DB and returns it."""
    from backend.auth_utils import get_password_hash
    user = User(
        email="test@coachonurai.com",
        hashed_password=get_password_hash("testpassword123"),
        is_premium=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture(scope="function")
def test_user_token(client, test_user):
    """Returns a valid JWT Bearer token string for the test_user."""
    response = client.post(
        "/api/auth/login",
        json={"email": "test@coachonurai.com", "password": "testpassword123"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]
