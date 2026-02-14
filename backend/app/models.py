
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Profil
    weight_kg = Column(Float)
    ftp_watts = Column(Integer)
    max_hr = Column(Integer)
    
    # Garmin Integration
    garmin_email = Column(String(255), nullable=True)
    garmin_password = Column(String(500), nullable=True)  # Encrypted
    
    activities = relationship("Activity", back_populates="user", cascade="all, delete-orphan")

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True)
    description = Column(Text)
    country = Column(String(100))
    distance_km = Column(Float)
    elevation_gain_m = Column(Float)
    max_gradient = Column(Float)
    avg_gradient = Column(Float)
    gpx_file = Column(String(500))
    popularity = Column(Integer, default=0)
    difficulty = Column(Integer)  # 1-5
    created_at = Column(DateTime, default=datetime.utcnow)
    
    elevation_profile = Column(JSON)
    coordinates = Column(JSON)

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    route_id = Column(Integer, ForeignKey("routes.id"), nullable=True)
    
    start_time = Column(DateTime, default=datetime.utcnow)
    duration_seconds = Column(Integer)
    distance_m = Column(Float)
    total_elevation_gain = Column(Float)
    
    avg_power = Column(Integer)
    max_power = Column(Integer)
    normalized_power = Column(Integer)
    tss = Column(Float)
    
    avg_hr = Column(Integer)
    max_hr = Column(Integer)
    avg_cadence = Column(Integer)
    max_cadence = Column(Integer)
    
    detailed_data = Column(JSON)
    
    user = relationship("User", back_populates="activities")

class VirtualRideSession(Base):
    __tablename__ = "virtual_ride_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    route_id = Column(Integer, ForeignKey("routes.id"))
    
    status = Column(String(50), default="active")
    current_distance_m = Column(Float, default=0)
    current_elevation_m = Column(Float, default=0)
    current_gradient = Column(Float, default=0)
    
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    
    last_speed_kmh = Column(Float, default=0)
    last_power = Column(Integer, default=0)
    last_cadence = Column(Integer, default=0)
    last_heart_rate = Column(Integer)
