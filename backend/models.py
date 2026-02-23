from datetime import datetime
from sqlalchemy import Column, Integer, String, JSON, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Native app password (optional for social logins)
    google_id = Column(String, unique=True, nullable=True, index=True)
    facebook_id = Column(String, unique=True, nullable=True, index=True)
    
    # Garmin Linked Account Data
    # In a prod environment, garmin_password SHOULD BE ENCRYPTED, NOT HASHED
    # because the Garmin API needs the raw password to log in.
    garmin_email = Column(String, nullable=True) 
    garmin_password = Column(String, nullable=True)
    
    # Relationships
    nutrition_entries = relationship("NutritionEntry", back_populates="user")

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON)  # Store complex objects like 'metrics' or 'races' as JSON

class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("users.email"), nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    meal_time = Column(DateTime, nullable=False)
    
    # Nutrition data
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)  # grams
    carbs = Column(Float, nullable=False)  # grams
    fats = Column(Float, nullable=False)  # grams
    
    # AI analysis
    food_description = Column(String, nullable=False)
    confidence = Column(String, nullable=True)
    
    # Image data (optional, base64)
    image_data = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="nutrition_entries")
