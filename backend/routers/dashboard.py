from fastapi import APIRouter, HTTPException, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from backend.services.garmin_client import GarminClient
from backend.services.coach_brain import CoachBrain
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
    # 1. Try Environment Variables (Legacy/Dev)
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    
    client = None
    
    if email and password:
        # Env vars present, use them
        client = GarminClient(email, password)
        try:
            success, status, msg = client.login(db=db)
            if not success:
                 # If env vars are wrong, we might still want to check DB sessions?
                 # ideally yes, but let's stick to simple logic: Env vars take precedence.
                 logger.warning(f"Env var login failed: {msg}")
                 # Fall through to try DB session check? No, invalid env vars usually mean config error.
                 # But to be safe for the user explanation, let's allow fallthrough.
                 client = None
        except Exception as e:
            logger.error(f"Env var login error: {e}")
            client = None
            
    # 2. If no client yet, try to find ANY active session in DB (Single User Mode fallback)
    if not client:
        # Search for a valid session token in UserSettings
        # limit to 1 for now since we are transitioning from single user
        from backend.models import UserSetting
        # We need to find a key strictly starting with "garmin_session_"
        # But we don't know the email. 
        # Strategy: Find any key like 'garmin_session_%'
        try:
            session_record = db.query(UserSetting).filter(UserSetting.key.like("garmin_session_%")).first()
            if session_record:
                # Extract email from key
                email_from_db = session_record.key.replace("garmin_session_", "")
                # We don't have the password, but we have tokens! 
                # GarminClient needs email/pass to init, but maybe we can bypass if we rely purely on tokens?
                # The GarminClient.restore_session_from_data re-initializes Garmin(email, pass).
                # We can pass dummy password if tokens are valid.
                
                logger.info(f"Attempting to resume session for {email_from_db} from DB")
                client = GarminClient(email_from_db, "dummy_password") 
                if client.restore_session_from_data(session_record.value):
                    # verify it works
                    pass
                else:
                    client = None
        except Exception as e:
            logger.error(f"DB session resume error: {e}")
            
    # 3. Final Check
    if not client:
        # No env vars, no DB session.
        # RETURN 401 so Frontend can redirect to Login
        raise HTTPException(
            status_code=401, 
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
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

@router.get("/debug-garmin")
def debug_garmin_connection(db: Session = Depends(get_db)):
    """
    Diagnostic endpoint to test Garmin connection and return detailed errors.
    """
    import traceback
    import os
    
    report = {
        "env_email_set": bool(os.getenv("GARMIN_EMAIL")),
        "env_password_set": bool(os.getenv("GARMIN_PASSWORD")),
        "test_results": []
    }
    
    try:
        email = os.getenv("GARMIN_EMAIL")
        password = os.getenv("GARMIN_PASSWORD")
        
        if not email or not password:
            return {"error": "Credentials missing in environment variables", "details": report}
            
        client = GarminClient(email, password)
        report["test_results"].append("GarminClient instantiated")
        
        # Try login
        try:
            success, status, msg = client.login(db=db)
            report["login_success"] = success
            report["login_status"] = status
            report["login_message"] = msg
            
            if success:
                profile = client.get_profile()
                report["profile_name"] = profile.get("displayName") if profile else "Unknown"
        except Exception as e:
            report["login_error"] = str(e)
            report["login_traceback"] = traceback.format_exc()
            
    except Exception as e:
        report["critical_error"] = str(e)
        report["critical_traceback"] = traceback.format_exc()
        
    return report
