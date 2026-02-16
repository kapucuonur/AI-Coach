from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from backend.services.garmin_client import GarminClient
from backend.services.coach_brain import CoachBrain
from backend.routers.settings import load_settings
from backend.database import get_db
import os
import traceback
import logging
import math
from datetime import date

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def clean_nans(obj):
    """
    Recursively replace NaN and Infinity with None to ensure JSON compliance.
    """
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: clean_nans(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nans(v) for v in obj]
    return obj

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
        return clean_nans(stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/profile")
def get_user_profile(client: GarminClient = Depends(get_garmin_client)):
    """Fetch user profile including VO2 max and other metrics"""
    try:
        profile = client.get_profile()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return clean_nans(profile)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@router.get("/activities")
def get_recent_activities(limit: int = 5, client: GarminClient = Depends(get_garmin_client)):
    try:
        activities = client.get_activities(limit)
        return clean_nans(activities)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activities/{activity_id}/details")
def get_activity_details(activity_id: int, client: GarminClient = Depends(get_garmin_client)):
    logger.info(f"Fetching activity details for {activity_id}")
    analysis = None
    details = None
    
    try:
        # 1. Fetch details from Garmin
        details = client.get_activity_details(activity_id)
        
        if not details:
            logger.warning(f"Activity {activity_id} not found in Garmin.")
            raise HTTPException(status_code=404, detail="Activity not found")
            
        # Clean potential NaNs which break JSON serialization
        try:
            details = clean_nans(details)
        except Exception as e:
            logger.error(f"Error cleaning NaNs from details: {e}")
            # Continue with original details if cleaning fails
            
        # 2. AI Analysis - wrapped in try-catch to return partial data if it fails
        try:
            logger.info("Starting AI Analysis...")
            gemini_key = os.getenv("GEMINI_API_KEY")
            if not gemini_key:
                logger.warning("GEMINI_API_KEY missing - skipping AI analysis")
                analysis = "AI analysis unavailable: API key not configured."
            else:
                brain = CoachBrain(gemini_key)
                
                user_settings_dict = {}
                try:
                    settings = load_settings()
                    user_settings_dict = settings.model_dump()
                except Exception as se:
                    logger.warning(f"Failed to load settings: {se}")
                
                analysis = brain.analyze_activity(details, user_settings_dict)
                logger.info("AI analysis completed successfully")
        except Exception as ai_error:
            logger.error(f"AI analysis failed but continuing with activity data: {ai_error}")
            analysis = f"Activity analysis temporarily unavailable. Please try again later."
        
        response_data = {
            "details": details,
            "analysis": analysis
        }
        
        return jsonable_encoder(response_data)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching activity details: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {str(e)}")

@router.get("/health-history")
def get_health_history(days: int = 7, client: GarminClient = Depends(get_garmin_client)):
    try:
        from datetime import timedelta
        history = []
        today = date.today()
        
        # Limit days to prevent long waits
        days = min(days, 30)
        
        for i in range(days):
            d = today - timedelta(days=i)
            d_str = d.isoformat()
            try:
                stats = client.get_health_stats(d_str)
                sleep = client.get_sleep_data(d_str)
                
                day_data = {
                    "date": d_str,
                    "resting_hr": stats.get('restingHeartRate') if stats else None,
                    "max_hr": stats.get('maxHeartRate') if stats else None,
                    "stress": stats.get('averageStressLevel') if stats else None,
                    "body_battery_max": stats.get('bodyBatteryLargestChargedValue') if stats else None,
                    "sleep_seconds": sleep.get('dailySleepDTO', {}).get('sleepTimeSeconds') if sleep and sleep.get('dailySleepDTO') else None,
                    "sleep_score": sleep.get('dailySleepDTO', {}).get('sleepScore') if sleep and sleep.get('dailySleepDTO') else None
                }
                history.append(day_data)
            except Exception as e:
                logger.warning(f"Failed to fetch stats for {d_str}: {e}")
                
        # Return oldest to newest for charts
        return sorted(history, key=lambda x: x['date'])
        
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
