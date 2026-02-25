from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from backend.services.coach_brain import CoachBrain
from backend.services.garmin_client import GarminClient
from backend.services.data_processor import DataProcessor
from backend.routers.settings import load_settings
from backend.routers.dashboard import get_garmin_client
from backend.database import get_db
import os
import logging
import json
from backend.auth_utils import get_current_user
from backend.models import User

router = APIRouter()
logger = logging.getLogger(__name__)

class PlanRequest(BaseModel):
    duration: str = "1-Week" # "1-Week" or "1-Month"
    language: Optional[str] = "en"

@router.post("/generate")
def generate_plan(
    request: PlanRequest, 
    client: GarminClient = Depends(get_garmin_client),
    current_user: User = Depends(get_current_user)
):
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        # 1. Fetch Data (Client is already authenticated via Depends)

        brain = CoachBrain(gemini_key)
        processor = DataProcessor()
        settings = load_settings(current_user.email)
        user_settings_dict = settings.model_dump()
        if request.language:
            user_settings_dict["language"] = request.language
        
        # Fetch necessary context
        activities = client.get_activities(30)
        health_stats = client.get_health_stats()
        # Sleep data is less critical for a long-term plan but good for context
        # sleep_data = client.get_sleep_data() 
        
        # Process Activity Data
        df = processor.process_activities(activities)
        weekly_summary = processor.calculate_weekly_summary(df)
        
        # Generate Plan
        # We need to make sure calculate_weekly_summary returns a DataFrame or Series that brain expects. 
        # brain.generate_structured_plan expects a dict or similar for activities_summary.
        # Let's check logic in previous file version or just cast to dict to be safe.
        
        # processor.calculate_weekly_summary returns a DataFrame or Series.
        # brain.generate_structured_plan signature: 
        # def generate_structured_plan(self, duration_str, user_profile, activities_summary, health_stats, user_settings):
        # usually activities_summary is passed as dict. 
        
        activities_summary_dict = {}
        if not weekly_summary.empty:
            # If it's a dataframe/series, convert.
             # In coach.py we did: weekly_summary.index = weekly_summary.index.astype(str) -> to_dict()
             # Let's replicate that safety.
             try:
                 weekly_summary.index = weekly_summary.index.astype(str)
                 activities_summary_dict = weekly_summary.to_dict()
             except:
                 activities_summary_dict = weekly_summary.to_dict()

        plan_json_str = brain.generate_structured_plan(
            duration_str=request.duration,
            user_profile=client.client.get_user_profile(),
            activities_summary=activities_summary_dict,
            health_stats=health_stats,
            user_settings=user_settings_dict
        )
        
        # Parse JSON
        try:
             plan_data = json.loads(plan_json_str)
             return plan_data
        except json.JSONDecodeError:
             return {"error": "Failed to parse AI plan", "raw": plan_json_str}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error generating plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))
