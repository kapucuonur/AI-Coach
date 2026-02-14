
from sqlalchemy.orm import Session
from typing import List
from app.models import Activity

class ActivityService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_activities(self, user_id: int, limit: int = 50) -> List[Activity]:
        return self.db.query(Activity).filter(
            Activity.user_id == user_id
        ).order_by(Activity.start_time.desc()).limit(limit).all()
    
    def get_activity_detail(self, activity_id: int, user_id: int) -> Activity:
        return self.db.query(Activity).filter(
            Activity.id == activity_id,
            Activity.user_id == user_id
        ).first()
