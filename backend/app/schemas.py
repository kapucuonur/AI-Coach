
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserProfile(BaseModel):
    weight_kg: Optional[float] = None
    ftp_watts: Optional[int] = None
    max_hr: Optional[int] = None

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    weight_kg: Optional[float] = None
    ftp_watts: Optional[int] = None
    max_hr: Optional[int] = None
    
    class Config:
        from_attributes = True

class RouteBase(BaseModel):
    name: str
    description: Optional[str] = None
    country: str
    distance_km: float
    elevation_gain_m: float
    max_gradient: float
    difficulty: int

class Route(RouteBase):
    id: int
    avg_gradient: float
    popularity: int
    elevation_profile: Optional[List[Dict]] = None
    coordinates: Optional[List[Dict]] = None
    
    class Config:
        from_attributes = True

class RouteSummary(BaseModel):
    id: int
    name: str
    country: str
    distance_km: float
    elevation_gain_m: float
    max_gradient: float
    difficulty: int
    
    class Config:
        from_attributes = True

class ActivityCreate(BaseModel):
    route_id: Optional[int] = None
    duration_seconds: int
    distance_m: float
    total_elevation_gain: float
    avg_power: int
    max_power: int
    normalized_power: Optional[int] = None
    tss: Optional[float] = None
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    avg_cadence: Optional[int] = None
    max_cadence: Optional[int] = None
    detailed_data: List[Dict[str, Any]]

class Activity(ActivityCreate):
    id: int
    user_id: int
    start_time: datetime
    
    class Config:
        from_attributes = True

class VirtualRideStart(BaseModel):
    route_id: int

class VirtualRideStatus(BaseModel):
    session_id: int
    status: str
    current_distance_m: float
    current_elevation_m: float
    current_gradient: float
    last_speed_kmh: float
    last_power: int
    last_cadence: int
    progress_percent: float

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
