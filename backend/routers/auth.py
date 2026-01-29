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
    """Check if we have a valid cached session"""
    import os
    env_email = os.getenv("GARMIN_EMAIL")
    env_pass = os.getenv("GARMIN_PASSWORD")
    
    if not env_email or not env_pass:
         return {"authenticated": False, "message": "No credentials in env"}

    try:
        client = GarminClient(env_email, env_pass)
        if client.login():
             return {"authenticated": True, "user": client.client.display_name}
    except:
        pass
    
    return {"authenticated": False}
