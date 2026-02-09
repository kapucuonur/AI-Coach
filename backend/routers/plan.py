from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.services.coach_brain import CoachBrain
from backend.services.garmin_client import GarminClient
from backend.services.data_processor import DataProcessor
from backend.routers.settings import load_settings
import os
import logging
import json

router = APIRouter()
logger = logging.getLogger(__name__)

class PlanRequest(BaseModel):
    email: str
    password: str
    duration: str = "1-Week" # "1-Week" or "1-Month"

@router.post("/generate")
def generate_plan(request: PlanRequest):
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        # 1. Fetch Data (Reuse Garmin Client logic or just persistent session)
        # For simplicity, we re-login to get fresh data or use cached session if we had one.
        # Ideally, we should reuse the session from a dependency. 
        # But here we'll just instantiate a client to fetch data.
        
        client = GarminClient(request.email, request.password)
        # Try login (assuming session might be valid or re-login needed)
        # In a real app, we'd use a session token. Here we use creds.
        success, _ = client.login() 
        if not success:
             raise HTTPException(status_code=401, detail="Authentication failed")

        brain = CoachBrain(gemini_key)
        processor = DataProcessor()
        settings = load_settings()
        user_settings_dict = settings.model_dump()
        
        # Fetch necessary context
        activities = client.get_activities(30)
        health_stats = client.get_health_stats()
        # Sleep data is less critical for a long-term plan but good for context
        # sleep_data = client.get_sleep_data() 
        
        # Process Activity Data
        df = processor.process_activities(activities)
        weekly_summary = processor.calculate_weekly_summary(df)
        
        # Generate Plan
        plan_json_str = brain.generate_structured_plan(
            duration_str=request.duration,
            user_profile=client.client.get_user_profile(),
            activities_summary=weekly_summary,
            health_stats=health_stats,
            user_settings=user_settings_dict
        )
        
        # Parse JSON
        try:
             plan_data = json.loads(plan_json_str)
             return plan_data
        except json.JSONDecodeError:
             return {"error": "Failed to parse AI plan", "raw": plan_json_str}

    except Exception as e:
        logger.error(f"Error generating plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))
