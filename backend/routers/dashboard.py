from fastapi import APIRouter, HTTPException, Depends
from backend.services.garmin_client import GarminClient
from backend.services.data_processor import DataProcessor
import os
from datetime import date

router = APIRouter()

def get_garmin_client():
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")
    client = GarminClient(email, password)
    if not client.login():
        raise HTTPException(status_code=401, detail="Failed to authenticate with Garmin")
    return client

@router.get("/summary")
def get_daily_summary(client: GarminClient = Depends(get_garmin_client)):
    try:
        today = date.today().isoformat()
        # stats = client.get_health_stats() # This gets yesterday/today depending on logic
        # Let's be specific
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
