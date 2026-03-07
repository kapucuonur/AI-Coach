from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import UserSetting, User
import logging
from datetime import date

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/workout")
def get_todays_workout(
    device: str = None,
    db: Session = Depends(get_db)
):
    """
    Endpoint for Garmin CIQ App to fetch today's workout target.
    Since CIQ app doesn't have OAuth yet, we fetch the latest approved workout.
    """
    try:
        # For prototype, we just grab the last saved workout for the main user
        # In production, CIQ app sends a unique token mapped to the user.
        setting = db.query(UserSetting).filter(UserSetting.key == "last_synced_workout").first()
        
        if not setting or not setting.value:
            # Fallback mock data if user hasn't synced an AI workout yet
            logger.info("No saved workout found, returning fallback.")
            return {
                "workoutName": "AI Target (No Sync)",
                "steps": [
                    {"type": "warmup", "duration": 600, "target": "zone2"},
                    {"type": "run", "duration": 2400, "target": "zone3"},
                    {"type": "cooldown", "duration": 300, "target": "zone1"}
                ]
            }

        workout_data = setting.value
        
        # Transform Garmin Connect workout format to our simple CIQ format
        steps = []
        if "workoutSegments" in workout_data and len(workout_data["workoutSegments"]) > 0:
            for step in workout_data["workoutSegments"][0].get("workoutSteps", []):
                step_type = step.get("stepType", {}).get("stepTypeKey", "run")
                
                duration = 0
                if "endConditionValue" in step:
                    # Time is usually in seconds or distance in meters
                    # Assuming time-based for now
                    duration = step.get("endConditionValue", 0)
                
                target = "open"
                if "targetValueOne" in step:
                    target = str(step.get("targetValueOne"))
                elif "targetType" in step:
                    target = step["targetType"].get("targetTypeKey", "open")

                steps.append({
                    "type": step_type,
                    "duration": duration if duration > 0 else 300, # default 5m if unknown
                    "target": target
                })
                
        return {
            "workoutName": workout_data.get("workoutName", "AI Daily Plan"),
            "steps": steps if len(steps) > 0 else [
                {"type": "run", "duration": 1800, "target": "zone2"}
            ]
        }
        
    except Exception as e:
        logger.error(f"Error serving Garmin App workout: {e}")
        raise HTTPException(status_code=500, detail=str(e))
