from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.services.garmin_client import GarminClient
from backend.services.coach_brain import CoachBrain
from backend.routers.settings import load_settings
from backend.database import get_db
import os
from datetime import date

router = APIRouter()

def get_garmin_client(db: Session = Depends(get_db)):
    # Try to get email/password from env first as a fallback/default
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    
    # If no env vars, we might fail if we don't have a session.
    # Ideally, we should get the email from the request header/token 
    # but for this specific app structure (single user/owner), env var is the identity.
    
    if not email or not password:
         raise HTTPException(status_code=500, detail="Server configuration error: Garmin credentials missing")

    client = GarminClient(email, password)
    
    # helper to unpack the tuple return from updated login()
    # We pass 'db' so it can try to load from DB first
    try:
        success, status, msg = client.login(db=db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")
    
    if not success:
        # If login failed (even after trying DB session), we return 401
        # This will happen if session expired AND env var password/email is wrong or requires 2FA fresh
        # For dashboard data calls, if we fail here, the user sees 401 and should be redirected to Login
        raise HTTPException(status_code=401, detail=f"Failed to authenticate with Garmin: {msg}")
        
    return client

@router.get("/summary")
def get_daily_summary(client: GarminClient = Depends(get_garmin_client)):
    try:
        today = date.today().isoformat()
        # client.client is the internal Garmin object
        stats = client.client.get_user_summary(today)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities")
def get_recent_activities(limit: int = 5, client: GarminClient = Depends(get_garmin_client)):
    try:
        activities = client.get_activities(limit)
        return activities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}/details")
def get_activity_details(activity_id: int, client: GarminClient = Depends(get_garmin_client)):
    try:
        # 1. Fetch details from Garmin
        details = client.get_activity_details(activity_id)
        if not details:
            raise HTTPException(status_code=404, detail="Activity not found")
            
        # 2. AI Analysis
        gemini_key = os.getenv("GEMINI_API_KEY")
        brain = CoachBrain(gemini_key)
        
        settings = load_settings()
        user_settings_dict = settings.model_dump()
        
        analysis = brain.analyze_activity(details, user_settings_dict)
        
        return {
            "details": details,
            "analysis": analysis
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
