from garminconnect import Garmin
import os
import json
from dotenv import load_dotenv

load_dotenv()
email = os.getenv("GARMIN_EMAIL")
password = os.getenv("GARMIN_PASSWORD")

client = Garmin(email, password)
client.login()

workout = {
    "sportType": {"sportTypeId": 1, "sportTypeKey": "running"},
    "workoutName": "AI Test Workout",
    "steps": [
        {
            "type": "ExecutableStepDTO",
            "stepId": None,
            "stepOrder": 1,
            "stepType": {"stepTypeId": 3, "stepTypeKey": "active"},
            "endCondition": {"conditionTypeId": 2, "conditionTypeKey": "time"},
            "endConditionValue": 1200,
            "targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"}
        }
    ]
}

try:
    res = client.upload_workout(workout)
    print("SUCCESS", res)
except Exception as e:
    print("ERROR", str(e))
