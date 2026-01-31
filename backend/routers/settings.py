from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from backend.database import get_db, engine
from backend import models

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

router = APIRouter()

class Race(BaseModel):
    name: str
    date: str # YYYY-MM-DD

class UserSettings(BaseModel):
    primary_sport: str = "Running"
    language: str = "en"
    age: Optional[int] = None
    gender: Optional[str] = None
    strength_days: int = 0
    metrics: Dict = {}
    races: List[Race] = []
    coach_style: str = "Supportive"

@router.get("/", response_model=UserSettings)
def get_settings(db: Session = Depends(get_db)):
    # Retrieve settings from DB. We store the entire object under a specific key, e.g., "main_settings"
    # or we could break it down. For simplicity, let's store the whole config as one JSON blob for this user.
    # In a multi-user app, we'd have a user_id. Here, it's single user.
    
    setting = db.query(models.UserSetting).filter(models.UserSetting.key == "main_config").first()
    
    if setting and setting.value:
        return UserSettings(**setting.value)
    
    return UserSettings() # Return defaults

@router.post("/", response_model=UserSettings)
def save_settings(settings: UserSettings, db: Session = Depends(get_db)):
    db_setting = db.query(models.UserSetting).filter(models.UserSetting.key == "main_config").first()
    
    if not db_setting:
        db_setting = models.UserSetting(key="main_config", value=settings.model_dump())
        db.add(db_setting)
    else:
        db_setting.value = settings.model_dump()
    
    db.commit()
    db.refresh(db_setting)
    return UserSettings(**db_setting.value)

# Legacy load support (optional, for other modules calling it directly)
def load_settings():
    # This might be tricky if used outside of a request context where we can inject Depends(get_db)
    # We can create a new session just for this utility.
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        setting = db.query(models.UserSetting).filter(models.UserSetting.key == "main_config").first()
        if setting and setting.value:
            return UserSettings(**setting.value)
        return UserSettings()
    finally:
        db.close()
