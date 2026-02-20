from fastapi import APIRouter, HTTPException, Depends
from backend.services.garmin_client import GarminClient
from backend.services.data_processor import DataProcessor
from backend.services.coach_brain import CoachBrain
from backend.database import get_db
from backend.auth_utils import create_access_token
from sqlalchemy.orm import Session
import os
from datetime import date
import pandas as pd
import traceback
import logging
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

from backend.schemas import GarminLoginSchema
from backend.routers.settings import load_settings

@router.post("/daily-metrics")
async def get_daily_metrics(user_data: GarminLoginSchema, db: Session = Depends(get_db)):
    try:
        client = GarminClient(user_data.email, user_data.password)
        
        # Pass DB session to login for persistence
        # We run login in a thread since it's synchronous
        success, status, error_msg = await asyncio.to_thread(client.login, db, user_data.mfa_code)
        
        if not success:
             logger.warning(f"Login failed: {status} - {error_msg}")
             if status == "MFA_REQUIRED":
                 raise HTTPException(status_code=401, detail="MFA_REQUIRED")
             raise HTTPException(status_code=401, detail=error_msg)
             
        processor = DataProcessor()
        
        # 1. Fetch Data Concurrently
        activities_task = asyncio.to_thread(client.get_activities, 30)
        health_stats_task = asyncio.to_thread(client.get_health_stats)
        sleep_data_task = asyncio.to_thread(client.get_sleep_data)
        profile_task = asyncio.to_thread(client.client.get_user_profile)
        
        activities, health_stats, sleep_data, profile = await asyncio.gather(
            activities_task, health_stats_task, sleep_data_task, profile_task
        )
        
        # 2. Process Data for summary block
        df = processor.process_activities(activities)
        weekly_summary = processor.calculate_weekly_summary(df)
        
        # Filter for TODAY'S activities
        todays_activities = []
        if not df.empty:
            today = date.today()
            todays_df = df[df['date'].dt.date == today]
            if not todays_df.empty:
                todays_activities = todays_df.to_dict(orient='records')

        activities_summary_dict = {}
        if not weekly_summary.empty:
            weekly_summary.index = weekly_summary.index.astype(str)
            activities_summary_dict = weekly_summary.to_dict()

        # Sanitize helpers
        import numpy as np
        def sanitize_for_json(obj):
            if isinstance(obj, pd.DataFrame):
                return obj.to_dict(orient="records")
            if isinstance(obj, (pd.Timestamp, date)):
                return obj.isoformat()
            if isinstance(obj, (np.integer, int)):
                return int(obj)
            if isinstance(obj, (np.floating, float)):
                return None if pd.isna(obj) or np.isnan(obj) else float(obj)
            if isinstance(obj, (np.ndarray, list)):
                return [sanitize_for_json(x) for x in obj]
            if isinstance(obj, dict):
                return {k: sanitize_for_json(v) for k, v in obj.items()}
            if pd.isna(obj): # Handles pd.NA, np.nan, None
                return None
            return obj

        response_data = {
            "metrics": {
                "health": health_stats,
                "sleep": sleep_data,
                "weekly_volume": activities_summary_dict,
                "recent_activities": activities,
                "profile": profile
            },
            "todays_activities": todays_activities, # Pass down for the AI to use later
            "access_token": create_access_token(email=user_data.email),
            "token_type": "bearer"
        }
        
        return sanitize_for_json(response_data)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in daily metrics: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class AIAdviceRequest(GarminLoginSchema):
    todays_activities: list = []
    activities_summary_dict: dict = {}
    health_stats: dict = {}
    sleep_data: dict = {}
    profile: dict = {}

@router.post("/generate-advice")
async def generate_advice(payload: AIAdviceRequest):
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        brain = CoachBrain(gemini_key)
        
        # Load user personalization
        settings = load_settings()
        user_settings_dict = settings.model_dump()
        
        # 3. AI Generation (Offloaded to second request)
        raw_advice = await asyncio.to_thread(
            brain.generate_daily_advice,
            payload.profile, 
            payload.activities_summary_dict, 
            payload.health_stats, 
            payload.sleep_data, 
            user_settings_dict, 
            payload.todays_activities,
            client_local_time=payload.client_local_time
        )
        
        # Parse the JSON string from Gemini
        import json
        try:
            parsed_advice = json.loads(raw_advice)
            advice_text = parsed_advice.get("advice_text", raw_advice)
            workout = parsed_advice.get("workout", None)
        except json.JSONDecodeError:
            logger.warning("Failed to parse advice JSON, returning raw text")
            advice_text = raw_advice
            workout = None

        return {
            "advice": advice_text,
            "workout": workout
        }

    except Exception as e:
        logger.error(f"Error generating advice: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync")
def sync_workout_to_watch(
    request: dict,
    client: GarminClient = Depends(lambda: None)  # Placeholder - will implement proper auth
):
    """
    Send AI-generated workout to Garmin Connect.
    TODO: Implement proper workout format conversion for Garmin API.
    """
    try:
        workout = request.get("workout")
        
        if not workout:
            raise HTTPException(status_code=400, detail="No workout data provided")
        
        logger.info(f"Received workout sync request: {workout.get('workoutName', 'Unnamed')}")
        
        # TODO: Convert AI workout format to Garmin's format and actually create it
        # For now, just log and return success to test the flow
        logger.info(f"Workout details: {workout}")
        
        # Placeholder - will implement actual Garmin API call
        # success = client.create_workout(garmin_format_workout)
        
        return {
            "status": "success", 
            "message": "Workout logged (sync to device pending implementation)"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error syncing workout: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
