
import garminconnect
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import Activity, User
from app.config import GARMIN_EMAIL, GARMIN_PASSWORD
import logging

logger = logging.getLogger(__name__)

class GarminService:
    def __init__(self, db: Session):
        self.db = db
        self.client = None

    def login(self, email=None, password=None):
        email = email or GARMIN_EMAIL
        password = password or GARMIN_PASSWORD
        
        if not email or not password:
            raise ValueError("Garmin credentials needed.")

        try:
            self.client = garminconnect.Garmin(email, password)
            self.client.login()
            logger.info(f"Garmin login successful for {email}")
        except Exception as e:
            logger.error(f"Garmin login failed: {e}")
            raise e

    def sync_activities(self, user_id: int, limit=5):
        """
        Fetches recent activities from Garmin and saves them to DB for the given user.
        """
        if not self.client:
            self.login()

        # Garmin returns a list of activities (default 10)
        try:
            activities = self.client.get_activities(0, limit)
        except Exception as e:
            logger.error(f"Failed to fetch activities: {e}")
            return {"error": str(e)}

        synced_count = 0
        user = self.db.query(User).filter(User.id == user_id).first()
        ftp = user.ftp_watts if user and user.ftp_watts else 200  # Default FTP

        for act in activities:
            garmin_id = str(act['activityId'])
            
            # Check if exists
            exists = self.db.query(Activity).filter(Activity.garmin_id == garmin_id).first()
            if exists:
                continue

            # Safe extraction of nested data
            avg_cadence = (act.get('averageRunningCadenceInStepsPerMinute') or 
                           act.get('averageBikingCadenceInRevPerMinute') or 0)
            
            # Create Activity Record
            new_activity = Activity(
                garmin_id=garmin_id,
                name=act['activityName'],
                sport_type=act['activityType']['typeKey'],
                start_time=datetime.strptime(act['startTimeLocal'], '%Y-%m-%d %H:%M:%S'),
                duration_seconds=act['duration'],
                distance_m=act['distance'],
                total_elevation_gain=act['elevationGain'],
                avg_power=act.get('averagePower', 0),
                max_power=act.get('maxPower', 0),
                avg_hr=act.get('averageHR', 0),
                max_hr=act.get('maxHR', 0),
                avg_cadence=avg_cadence,
                user_id=user_id,
                detailed_data=act  # Store full JSON for AI analysis
            )
            
            # Calculate TSS (Training Stress Score)
            # TSS = (sec * NP * IF) / (FTP * 3600) * 100
            # IF = NP / FTP
            # Simplified: IF = avg_power / FTP (since we don't have NP yet)
            if new_activity.avg_power and new_activity.duration_seconds and ftp > 0:
                intensity_factor = new_activity.avg_power / ftp
                tss = (new_activity.duration_seconds * new_activity.avg_power * intensity_factor) / (ftp * 3600) * 100
                new_activity.tss = round(tss, 1)

            self.db.add(new_activity)
            synced_count += 1
            logger.info(f"Synced activity: {new_activity.name}")

        self.db.commit()
        return {"synced": synced_count, "message": f"Successfully synced {synced_count} activities."}
