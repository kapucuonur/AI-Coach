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
import numpy as np
import traceback
import logging
import asyncio
import json
import time
from fastapi import Request
from jose import jwt, JWTError
from backend.auth_utils import ALGORITHM, SECRET_KEY

def sanitize_for_json(obj):
    """Reusable JSON sanitizer for numpy/pandas data types."""
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

router = APIRouter()
logger = logging.getLogger(__name__)

from pydantic import BaseModel
from backend.routers.settings import load_settings
from backend.auth_utils import get_current_user, decrypt_garmin_password
from backend.models import User
from datetime import datetime
from typing import Optional

class DailyMetricsRequest(BaseModel):
    client_local_time: Optional[str] = None

@router.post("/daily-metrics")
async def get_daily_metrics(
    payload: DailyMetricsRequest,
    request: Request,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    try:
        if not current_user.garmin_email or not current_user.garmin_password:
            # Return specific error so frontend shows "Connect Garmin" modal
            raise HTTPException(status_code=400, detail="GARMIN_NOT_CONNECTED")
            
        decrypted_pass = decrypt_garmin_password(current_user.garmin_password)
        client = GarminClient(current_user.garmin_email, decrypted_pass)
        
        # Pass DB session to login for persistence
        # We run login in a thread since it's synchronous
        success, status, error_msg = await asyncio.to_thread(client.login, db)
        
        if not success:
             logger.warning(f"Login failed: {status} - {error_msg}")
             if status == "MFA_REQUIRED":
                 raise HTTPException(status_code=401, detail="GARMIN_MFA_REQUIRED")
             raise HTTPException(status_code=401, detail=f"Garmin auth failed: {error_msg}")
             
        processor = DataProcessor()
        
        # 1. Fetch Data Concurrently
        activities_task = asyncio.to_thread(client.get_activities, 30)
        health_stats_task = asyncio.to_thread(client.get_health_stats)
        sleep_data_task = asyncio.to_thread(client.get_sleep_data)
        profile_task = asyncio.to_thread(client.get_profile)
        vo2_max_task = asyncio.to_thread(client.get_vo2_max)
        
        activities, health_stats, sleep_data, profile, vo2_max_data = await asyncio.gather(
            activities_task, health_stats_task, sleep_data_task, profile_task, vo2_max_task
        )
        
        # Merge VO2 max data into profile if available
        if vo2_max_data and profile:
            profile.update(vo2_max_data)
            
        # 2. Process Data for summary block
        df = processor.process_activities(activities)
        weekly_summary = processor.calculate_weekly_summary(df)
        
        # Filter for TODAY'S activities (Timezone-Aware)
        todays_activities = []
        if not df.empty and 'date' in df.columns:
            if payload.client_local_time:
                try:
                    cleaned_time = payload.client_local_time.replace('Z', '+00:00')
                    client_dt = datetime.fromisoformat(cleaned_time)
                    today = client_dt.date()
                except (ValueError, AttributeError):
                    today = date.today()
            else:
                today = date.today()
                
            todays_df = df[df['date'].dt.date == today]
            if not todays_df.empty:
                todays_activities = todays_df.to_dict(orient='records')

        activities_summary_dict = {}
        if not weekly_summary.empty:
            weekly_summary.index = weekly_summary.index.astype(str)
            activities_summary_dict = weekly_summary.to_dict()

        # Sanitize helpers

        # Only refresh token if less than 24 hours remain
        needs_refresh = False
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                exp = payload.get("exp")
                if exp and exp - time.time() < 86400:
                    needs_refresh = True
            except JWTError:
                needs_refresh = True

        response_data = {
            "metrics": {
                "health": health_stats,
                "sleep": sleep_data,
                "weekly_volume": activities_summary_dict,
                "recent_activities": activities,
                "profile": profile
            },
            "todays_activities": todays_activities # Pass down for the AI to use later
        }
        
        if needs_refresh:
            response_data["access_token"] = create_access_token(data={"sub": current_user.email})
            response_data["token_type"] = "bearer"
        
        return sanitize_for_json(response_data)

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in daily metrics: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class AIAdviceRequest(BaseModel):
    todays_activities: list = []
    activities_summary_dict: dict = {}
    health_stats: dict = {}
    sleep_data: dict = {}
    profile: dict = {}
    available_time_mins: int = None
    language: str = None  # Add explicit language parameter
    client_local_time: str = None

@router.post("/generate-advice")
async def generate_advice(
    request: Request,
    payload: AIAdviceRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        brain = request.app.state.brain
        
        # Load user personalization
        settings = load_settings(current_user.email)
        user_settings_dict = settings.model_dump()
        
        # Override language if provided explicitly in the payload
        if payload.language:
            user_settings_dict['language'] = payload.language
        
        # 3. AI Generation (Offloaded to second request)
        raw_advice = await asyncio.to_thread(
            brain.generate_daily_advice,
            payload.profile, 
            payload.activities_summary_dict, 
            payload.health_stats, 
            payload.sleep_data, 
            user_settings_dict, 
            payload.todays_activities,
            client_local_time=payload.client_local_time,
            available_time_mins=payload.available_time_mins
        )
        
        # Parse the JSON string from Gemini
        try:
            parsed_advice = json.loads(raw_advice)
            advice_text = parsed_advice.get("advice_text", raw_advice)
            workout = parsed_advice.get("workout", None)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse advice JSON, returning raw text: {e}")
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

from backend.routers.dashboard import get_garmin_client
from typing import Optional, Union

class WorkoutSyncRequest(BaseModel):
    workout: dict
    deviceId: Optional[Union[str, int]] = None

@router.post("/sync")
async def sync_workout_to_watch(
    request: WorkoutSyncRequest,
    client: GarminClient = Depends(get_garmin_client)
):
    """
    Send AI-generated workout to Garmin Connect and schedule it for today.
    """
    try:
        workout = request.workout
        device_id = request.deviceId
        
        if not workout:
            raise HTTPException(status_code=400, detail="No workout data provided")
        
        logger.info(f"Received workout sync request: {workout.get('workoutName', 'Unnamed')} for device: {device_id}")
        
        # 1. Create Workout in Garmin Connect (Async wrapper around blocking call)
        try:
            created_workout = await asyncio.to_thread(client.create_workout, workout)
            workout_id = created_workout.get("workoutId")
        except Exception as e:
            logger.error(f"Failed to create workout: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save workout to Garmin Connect: {e}")
            
        if not workout_id:
            raise HTTPException(status_code=500, detail="Failed to retrieve workout ID after creation")
            
        # 2. Schedule Workout for Today (non-fatal - workout is already saved if this fails)
        today_str = date.today().isoformat()
        scheduled = False
        try:
            scheduled = await asyncio.to_thread(client.schedule_workout, workout_id, today_str)
        except Exception as sched_err:
            logger.warning(f"Could not schedule workout on calendar (non-fatal): {sched_err}")
        
        # 3. Queue for specific device (if provided)
        if device_id:
            try:
                await asyncio.to_thread(client.send_workout_to_device, workout_id, device_id)
            except Exception as dev_err:
                logger.warning(f"Could not send workout to device (non-fatal): {dev_err}")
            
        msg = "Workout saved and scheduled for today." if scheduled else "Workout saved to Garmin Connect. Calendar scheduling unavailable - open the Garmin Connect app to see it."
        return {
            "status": "success", 
            "message": msg,
            "workoutId": workout_id,
            "scheduled": scheduled
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error syncing workout: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
