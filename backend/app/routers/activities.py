
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas import Activity
from app.services.activity_service import ActivityService
from app.dependencies import get_current_active_user
from app.models import User as UserModel
from app.services.garmin_service import GarminService
from pydantic import BaseModel
from typing import Optional

class GarminCredentials(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None

router = APIRouter()

@router.post("/sync/garmin")
def sync_garmin_activities(
    creds: GarminCredentials,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    service = GarminService(db)
    try:
        # If user provides credentials in request, use them. Otherwise service uses env or error.
        if creds.email and creds.password:
            service.login(creds.email, creds.password)
        
        result = service.sync_activities(current_user.id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[Activity])
def get_activities(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    service = ActivityService(db)
    return service.get_user_activities(current_user.id, limit)

@router.get("/{activity_id}")
def get_activity_detail(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    service = ActivityService(db)
    activity = service.get_activity_detail(activity_id, current_user.id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return activity
