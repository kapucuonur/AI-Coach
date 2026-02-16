from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.services.garmin_client import GarminClient
from backend.database import get_db
from backend.auth_utils import create_access_token
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    email: str
    password: str

class MFARequest(BaseModel):
    email: str
    code: str
    password: str = "" # Optional, needed if we need to re-instantiate client

@router.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    try:
        # Initialize client
        client = GarminClient(credentials.email, credentials.password)
        
        # Attempt login with DB persistence
        success, status, message = client.login(db=db)
        
        if success:
            # Generate JWT token for authenticated user
            access_token = create_access_token(email=credentials.email)
            
            return {
                "status": "success", 
                "message": message, 
                "display_name": client.client.display_name,
                "access_token": access_token,
                "token_type": "bearer"
            }
        elif status == "MFA_REQUIRED":
            return {
                "status": "mfa_required",
                "message": "Verify identity", 
                "detail": message
            }
        else:
             raise HTTPException(status_code=401, detail=message)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login/mfa")
def mfa_login(data: MFARequest, db: Session = Depends(get_db)):
    try:
        # Re-instantiate client. Ideally we'd have the password in PENDING_SESSIONS 
        # checking based on email, but simpler is to pass it.
        # However, for security, the frontend should ideally send it or we should retrieve it if we stored it properly.
        # Current implementation assumes we might need to start a fresh thread if the old one died, 
        # so password is safer to have.
        
        client = GarminClient(data.email, data.password)
        
        success, status, message = client.login(db=db, mfa_code=data.code)
        
        if success:
            # Generate JWT token for authenticated user
            access_token = create_access_token(email=data.email)
            
            return {
                "status": "success", 
                "message": message, 
                "display_name": client.client.display_name if client.client and hasattr(client.client, 'display_name') else "User",
                "access_token": access_token,
                "token_type": "bearer"
            }
        else:
            raise HTTPException(status_code=401, detail=message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """
    Check authentication status.
    """
    return {"authenticated": False}

