
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import User, UserProfile
from app.models import User as UserModel
from app.dependencies import get_current_active_user

router = APIRouter()

@router.get("/me", response_model=User)
def read_current_user(current_user: UserModel = Depends(get_current_active_user)):
    return current_user

@router.put("/me/profile")
def update_profile(
    profile: UserProfile,
    current_user: UserModel = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    current_user.weight_kg = profile.weight_kg
    current_user.ftp_watts = profile.ftp_watts
    current_user.max_hr = profile.max_hr
    db.commit()
    return {"message": "Profile updated"}

from pydantic import BaseModel
from app.utils.crypto import encrypt_password

class GarminCredentialsUpdate(BaseModel):
    email: str
    password: str

@router.put("/me/garmin-credentials")
def update_garmin_credentials(
    creds: GarminCredentialsUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    current_user.garmin_email = creds.email
    current_user.garmin_password = encrypt_password(creds.password)
    db.commit()
    return {"message": "Garmin credentials updated successfully"}
