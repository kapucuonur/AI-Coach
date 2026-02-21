from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from backend.services.garmin_client import GarminClient
from backend.services.coach_brain import CoachBrain
from backend.routers.settings import load_settings
from backend.database import get_db
from backend.auth_utils import get_current_user
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

from backend.auth_utils import get_current_user
from backend.models import User

def get_garmin_client(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> GarminClient:
    """
    Get authenticated Garmin client for the current user.
    """
    logger.info(f"Getting Garmin client for user: {current_user.email}")
    
    if not current_user.garmin_email or not current_user.garmin_password:
        raise HTTPException(
            status_code=400, 
            detail="GARMIN_NOT_CONNECTED"
        )
        
    logger.info(f"Using database session for {current_user.email}")
    client = GarminClient(current_user.garmin_email, current_user.garmin_password)
    
    # Attempt to authenticate/resume session from DB
    try:
        logger.info("Attempting to authenticate from DB session...")
        success, status, msg = client.login(db=db)
        logger.info(f"Authentication result: success={success}, status={status}")
    except Exception as e:
        logger.error(f"Exception during authentication: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to load Garmin session: {str(e)}")
    
    if not success:
        logger.warning(f"Garmin session expired or invalid for {email}")
        raise HTTPException(
            status_code=401,
            detail="Garmin session expired. Please log in again."
        )
    
    # Fire and forget: trigger an auto-sync to pull latest data from devices to Garmin Connect
    def fire_sync():
        try:
            client.sync_all_devices()
        except Exception as e:
            logger.warning(f"Background sync failed for {email}: {e}")
            
    import threading
    threading.Thread(target=fire_sync, daemon=True).start()
    
    logger.info(f"Garmin client authenticated successfully for {email}")
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
        logger.info("Fetching user profile from Garmin...")
        profile = client.get_profile()
        logger.info(f"Profile fetched successfully: {type(profile)}")
        
        if not profile:
            logger.warning("Profile data is None or empty")
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Fetch VO2 Max data separately using get_max_metrics()
        try:
            vo2_data = client.get_vo2_max()
            if vo2_data:
                # Merge all VO2 Max fields into profile for maximum compatibility
                logger.info(f"Merging VO2 Max data into profile: {vo2_data}")
                profile.update(vo2_data)  # This will add vo2MaxValue, vo2Max, etc.
        except Exception as vo2_error:
            logger.warning(f"Could not fetch VO2 Max data: {vo2_error}")
            
        cleaned = clean_nans(profile)
        logger.info("Profile data cleaned and ready to return")
        return cleaned
    except HTTPException as he:
        raise he
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching user profile: {error_trace}")
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
        
        # DEBUG: Log the structure to see actual field names
        logger.info(f"Activity details keys: {list(details.keys())[:20]}")  # First 20 keys
        if 'summaryDTO' in details:
            logger.info(f"summaryDTO keys: {list(details['summaryDTO'].keys())[:20]}")
            
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
