import os
from dotenv import load_dotenv
load_dotenv()
from backend.services.garmin_client import GarminClient
from backend.database import SessionLocal

db = SessionLocal()
client = GarminClient(os.getenv("GARMIN_EMAIL"), os.getenv("GARMIN_PASSWORD"))
success, _, _ = client.login(db)

# Payload with a SINGLE segment for all steps
payload = {
    "workoutName": "AI Coach - Sustained Power & Race Pace Simulation", 
    "sportType": {"sportTypeId": 2, "sportTypeKey": "cycling"}, 
    "description": "Build sustained power output simulating Olympic distance race efforts.", 
    "workoutSegments": [
        {
            "segmentOrder": 1,
            "sportType": {"sportTypeId": 2, "sportTypeKey": "cycling"}, 
            "workoutSteps": [
                {"type": "ExecutableStepDTO", "stepOrder": 1, "description": "Warmup: Easy spin", "stepType": {"stepTypeId": 1, "stepTypeKey": "warmup"}, "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"}, "preferredEndConditionUnit": None, "endConditionValue": 900, "targetType": {"workoutTargetTypeId": 4, "workoutTargetTypeKey": "heart.rate.zone"}, "targetValueOne": 2, "targetValueTwo": 2, "zoneNumber": None},
                {"type": "ExecutableStepDTO", "stepOrder": 2, "description": "Main Set: Olympic Effort Interval 1", "stepType": {"stepTypeId": 3, "stepTypeKey": "active"}, "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"}, "preferredEndConditionUnit": None, "endConditionValue": 900, "targetType": {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "power.zone"}, "targetValueOne": 3, "targetValueTwo": 4, "zoneNumber": None}, 
                {"type": "ExecutableStepDTO", "stepOrder": 3, "description": "Recovery: Easy Spin", "stepType": {"stepTypeId": 5, "stepTypeKey": "recovery"}, "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"}, "preferredEndConditionUnit": None, "endConditionValue": 300, "targetType": {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "power.zone"}, "targetValueOne": 1, "targetValueTwo": 2, "zoneNumber": None}
            ]
        }
    ]
}

try:
    response = client.create_workout(payload)
    print("Success:", response)
except Exception as e:
    import traceback
    if hasattr(e, 'error') and getattr(e.error, 'response', None) is not None:
        print("GARMIN API RESPONSE BODY:")
        print(e.error.response.text)
    else:
        traceback.print_exc()
