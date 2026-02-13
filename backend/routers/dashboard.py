from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from backend.services.garmin_client import GarminClient
from backend.services.coach_brain import CoachBrain
from backend.services.garmin_client import GarminClient
from backend.services.metrics_engine import MetricsEngine
from backend.models import DailyMetric
from backend.database import get_db
from sqlalchemy.orm import Session
import os
import traceback
import logging
import math
from datetime import date

def sanitize_json(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_json(v) for v in obj]
    return obj

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
        import traceback
        logger.error(f"Login unexpected error: {traceback.format_exc()}")
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

@router.get("/charts")
def get_dashboard_charts(date: str = None, client: GarminClient = Depends(get_garmin_client)):
    try:
        # date format YYYY-MM-DD, defaults to today in client
        data = client.get_detailed_charts(date)
        return sanitize_json(jsonable_encoder(data))
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching charts: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Chart Error: {str(e)}\n\nTraceback:\n{error_trace}")

@router.get("/activities/{activity_id}/details")
def get_activity_details(activity_id: int, client: GarminClient = Depends(get_garmin_client)):
    try:
        logger.info(f"Fetching details for activity {activity_id}")
        
        # 1. Fetch details from Garmin
        details = client.get_activity_details(activity_id)
        if not details:
            logger.warning(f"Activity {activity_id} not found in Garmin.")
            raise HTTPException(status_code=404, detail="Activity not found")
            
        # 2. AI Analysis
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            logger.error("GEMINI_API_KEY missing")
            raise HTTPException(status_code=500, detail="Server config error: GEMINI_API_KEY missing")

        brain = CoachBrain(gemini_key)
        
        try:
            settings = load_settings()
            user_settings_dict = settings.model_dump()
        except Exception as se:
            logger.warning(f"Failed to load settings: {se}")
            user_settings_dict = {}
        
        analysis = brain.analyze_activity(details, user_settings_dict)
        
        return sanitize_json(jsonable_encoder({
            "details": details,
            "analysis": analysis
        }))
    except HTTPException as he:
        raise he
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching activity details: {error_trace}")
        # Return the trace in the detail for debugging (in production usually hidden, but we need it here)
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}\n\nTrace:\n{error_trace}")
@router.get("/dashboard-data")
def get_dashboard_data(
    client_local_time: str = None, 
    client: GarminClient = Depends(get_garmin_client), 
    db: Session = Depends(get_db)
):
    """
    Consolidated endpoint to fetch all dashboard data.
    Now includes Advanced Metrics calculation.
    """
    logger.info(f"Fetching dashboard data. Client Time: {client_local_time}")

    # 1. Fetch Basic Data
    try:
        user_profile = client.get_profile()
        health_stats = client.get_health_stats() # Defaults to today
        sleep_data = client.get_sleep_data() # Defaults to today
        activities = client.get_activities(days=7) # Last 7 days for context
    except Exception as e:
        logger.error(f"Error fetching basic Garmin data: {e}")
        # We might want to return partial data or fail gracefully
        raise HTTPException(status_code=500, detail="Failed to fetch data from Garmin")

    # 2. Get User Settings
    try:
        from backend.routers.settings import load_settings
        settings = load_settings(db)
        user_settings_dict = settings.model_dump()
    except Exception as e:
        logger.warning(f"Using default settings due to error: {e}")
        user_settings_dict = {}

    # 3. Initialize Coach Brain
    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
         raise HTTPException(status_code=500, detail="GEMINI_API_KEY is missing")
    
    brain = CoachBrain(gemini_key)

    # 4. Advanced Metrics Calculation
    metrics_engine = MetricsEngine(db)
    
    current_date_str = date.today().isoformat()
    # Logic to calculate today's TSS
    todays_activities = []
    if activities:
        todays_activities = [a for a in activities if a['startTimeLocal'].startswith(current_date_str)]
    
    total_tss = 0
    for act in todays_activities:
        dur = act.get('duration', 0)
        avg_hr = act.get('averageHR', 0)
        max_hr = act.get('maxHR', 190)
        total_tss += metrics_engine.calculate_tss(dur, avg_hr, max_hr)

    # Update DailyMetric in DB
    try:
        metric = db.query(DailyMetric).filter(DailyMetric.date == current_date_str).first()
        if not metric:
            metric = DailyMetric(date=current_date_str, user_id=1) # Default user 1
            db.add(metric)
        
        metric.total_tss = total_tss
        if health_stats:
            metric.resting_hr = health_stats.get('restingHeartRate')
            metric.stress_score = health_stats.get('stressScore')
        if sleep_data:
            metric.sleep_score = sleep_data.get('dailySleepDTO', {}).get('sleepScore')
        
        db.commit()

        # Update Fatigue/Fitness
        metrics_engine.update_fitness_fatigue(1, current_date_str)
        # Assess Recovery
        recovery_color, recovery_msg = metrics_engine.assess_recovery(current_date_str)
        
        # Prepare context for AI
        metrics_context = {
            "ctl": metric.ctl,
            "atl": metric.atl,
            "tsb": metric.tsb,
            "recovery_color": recovery_color,
            "recovery_msg": recovery_msg
        }

    except Exception as e:
        logger.error(f"Failed to calculate metrics: {e}")
        metrics_context = None


    # 5. Generate Advice
    advice = brain.generate_daily_advice(
        user_profile=user_profile, 
        activities_summary=activities, 
        health_stats=health_stats, 
        sleep_data=sleep_data,
        user_settings=user_settings_dict,
        todays_activities=todays_activities,
        client_local_time=client_local_time,
        metrics_context=metrics_context
    )
    
    return sanitize_json(jsonable_encoder({
        "profile": user_profile,
        "health": health_stats,
        "sleep": sleep_data,
        "advice": advice,
        "metrics": metrics_context # Return metrics to frontend too if needed
    }))
