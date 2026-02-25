from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from backend.database import get_db, engine
from backend import models
from backend.auth_utils import get_current_user

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

router = APIRouter()

class Race(BaseModel):
    name: str
    date: str # YYYY-MM-DD

class UserSettings(BaseModel):
    primary_sport: str = "Running"
    also_runs: bool = True
    language: str = "en"
    age: Optional[int] = None
    gender: Optional[str] = None
    strength_days: int = 0
    off_days: List[str] = []  # e.g., ["Monday", "Sunday"]
    metrics: Dict = {}
    races: List[Race] = []
    goals: Dict[str, str] = {}  # e.g. {"running": "Marathon", "triathlon": "Olympic"}
    coach_style: str = "Supportive"

@router.get("/", response_model=UserSettings)
def get_settings(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    setting_key = f"{current_user.email}_config"
    setting = db.query(models.UserSetting).filter(models.UserSetting.key == setting_key).first()
    
    if setting and setting.value:
        # Create default model, then update with stored values to ensure no missing keys
        default_settings = UserSettings().model_dump()
        default_settings.update(setting.value)
        return UserSettings(**default_settings)
    
    return UserSettings() # Return defaults

@router.post("/", response_model=UserSettings)
def save_settings(settings: UserSettings, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    setting_key = f"{current_user.email}_config"
    db_setting = db.query(models.UserSetting).filter(models.UserSetting.key == setting_key).first()
    
    if not db_setting:
        db_setting = models.UserSetting(key=setting_key, value=settings.model_dump())
        db.add(db_setting)
    else:
        db_setting.value = settings.model_dump()
    
    db.commit()
    db.refresh(db_setting)
    return UserSettings(**db_setting.value)

# Legacy load support 
def load_settings(email: str = None):
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        # Default fallback to main_config if no email provided, though email should ideally be passed in now
        setting_key = f"{email}_config" if email else "main_config"
        setting = db.query(models.UserSetting).filter(models.UserSetting.key == setting_key).first()
        if setting and setting.value:
            default_settings = UserSettings().model_dump()
            default_settings.update(setting.value)
            return UserSettings(**default_settings)
        return UserSettings()
    finally:
        db.close()
