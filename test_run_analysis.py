import asyncio
from backend.services.coach_brain import CoachBrain

async def main():
    brain = CoachBrain()
    print("Sending test request to CoachBrain...")
    
    # Fake minimal profile + summary
    user_profile = {"fullName": "Test Athlete", "vo2MaxRunning": 50, "fitnessAge": 25}
    health_stats = {"restingHeartRate": 50, "averageStressLevel": 20, "bodyBatteryHighestValue": 90}
    
    res = brain.generate_daily_advice(
        user_profile, 
        "Ran 10k yesterday.",
        health_stats,
        None,
        {"primary_sport": "Running", "language": "en", "off_days": ["Thursday"]},  # Make Thursday off day or matching today
        [],
        "2026-03-03T19:00:00Z",
        90
    )
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
