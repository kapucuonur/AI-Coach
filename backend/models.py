from sqlalchemy import Column, Integer, String, JSON, Float
from backend.database import Base

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON) # Store complex objects like 'metrics' or 'races' as JSON

class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True) # YYYY-MM-DD
    user_id = Column(Integer, index=True) # For multi-user support down the line
    
    # Training Load Metrics (Banister Model)
    ctl = Column(Float, nullable=True) # Chronic Training Load (Fitness)
    atl = Column(Float, nullable=True) # Acute Training Load (Fatigue)
    tsb = Column(Float, nullable=True) # Training Stress Balance (Form)
    total_tss = Column(Float, default=0.0) # Total Training Stress Score for the day
    
    # Recovery Metrics
    resting_hr = Column(Integer, nullable=True)
    hrv_status = Column(String, nullable=True) # e.g. "Balanced", "Low"
    sleep_score = Column(Integer, nullable=True)
    stress_score = Column(Integer, nullable=True)
    body_battery_max = Column(Integer, nullable=True)
    body_battery_min = Column(Integer, nullable=True)

