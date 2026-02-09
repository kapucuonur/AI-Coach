from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.services.garmin_client import GarminClient
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(credentials: LoginRequest):
    try:
        # For now, we are relying on env vars or existing session, 
        # but this endpoint could accept creds to init a new session.
        # Ideally, we verify the existing session first.
        client = GarminClient(credentials.email, credentials.password)
        if client.login():
            return {"message": "Login successful", "display_name": client.client.display_name}
        else:
            raise HTTPException(status_code=401, detail="Login failed")
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def auth_status():
    """
    Check authentication status.
    Since we moved to dynamic credentials, we don't have a 'logged in' state 
    persisted on the server in the same way (unless using sessions/tokens).
    For now, we return False to prompt login on frontend if needed.
    """
    return {"authenticated": False}
