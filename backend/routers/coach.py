from fastapi import APIRouter, HTTPException, Depends
from backend.services.garmin_client import GarminClient
from backend.services.data_processor import DataProcessor
from backend.services.coach_brain import CoachBrain
import os
from datetime import date
import pandas as pd
import traceback
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

from backend.schemas import GarminLoginSchema
from backend.routers.settings import load_settings

@router.post("/daily-briefing")
def get_daily_briefing(user_data: GarminLoginSchema):
    try:
        # Initialize services with provided credentials
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        client = GarminClient(user_data.email, user_data.password)
        success, error_msg = client.login()
        if not success:
             print(f"Login failed details: {error_msg}") # Stdout for Render logs
             raise HTTPException(status_code=401, detail=error_msg)
             
        brain = CoachBrain(gemini_key)
        processor = DataProcessor()
        
        settings = load_settings()
        user_settings_dict = settings.model_dump()
        
        # 1. Fetch Data
        activities = client.get_activities(30)
        health_stats = client.get_health_stats()
        sleep_data = client.get_sleep_data()
        profile = client.client.get_user_profile() # Raw profile
        
        # 2. Process Data
        df = processor.process_activities(activities)
        weekly_summary = processor.calculate_weekly_summary(df)
        
        # 3. AI Generation
        # Convert df to summary string/dict for AI
        activities_summary_dict = {}
        if not weekly_summary.empty:
            weekly_summary.index = weekly_summary.index.astype(str)
            activities_summary_dict = weekly_summary.to_dict()
            
        raw_advice = brain.generate_daily_advice(profile, activities_summary_dict, health_stats, sleep_data, user_settings_dict)
        
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
            "workout": workout,
            "metrics": {
                "health": health_stats,
                "sleep": sleep_data,
                "weekly_volume": activities_summary_dict,
                "recent_activities": activities 
            }
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error in daily briefing: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
