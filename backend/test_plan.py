import asyncio
from backend.services.coach_brain import CoachBrain
from backend.models import User
import os
from dotenv import load_dotenv

load_dotenv()

def run():
    brain = CoachBrain()
    
    # Mock data
    user_settings = {"primary_sport": "Triathlon", "language": "en"}
    profile = {"fullName": "Onur", "vo2MaxRunning": 50, "fitnessAge": 34}
    health_stats = {"restingHeartRate": 50, "averageStressLevel": 21, "bodyBatteryHighestValue": 84}
    sleep_data = {"dailySleepDTO": {"sleepTimeSeconds": 32000, "sleepScore": 80, "sleepQualityType": "GOOD"}}
    activities_summary = {}

    try:
        res = brain.generate_structured_plan(
            duration_str="1-Week",
            user_profile=profile,
            activities_summary=activities_summary,
            health_stats=health_stats,
            sleep_data=sleep_data,
            user_settings=user_settings
        )
        print("SUCCESS:", res[:100])
    except Exception as e:
        import traceback
        traceback.print_exc()

run()
