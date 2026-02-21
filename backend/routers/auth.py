from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from backend.database import get_db
from backend.models import User
from backend.auth_utils import verify_password, get_password_hash, create_access_token

router = APIRouter(tags=["auth"])

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class GarminConnectRequest(BaseModel):
    garmin_email: str
    garmin_password: str

@router.post("/register")
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new native user
    hashed_pass = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email, 
        hashed_password=hashed_pass
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token immediately after registration so they are logged in
    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "has_garmin_connected": False
    }


@router.post("/login")
def login_user(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "has_garmin_connected": bool(user.garmin_email and user.garmin_password)
    }


from backend.auth_utils import verify_password, get_password_hash, create_access_token, get_current_user

@router.get("/me")
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "has_garmin_connected": bool(current_user.garmin_email and current_user.garmin_password)
    }

@router.post("/connect-garmin")
def connect_garmin_account(
    garmin_data: GarminConnectRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from backend.services.garmin_client import GarminClient
    
    # 1. Verify Garmin credentials are valid before saving them
    try:
        # Warning: This is a synchronous call blocking the thread. 
        # In a high-throughput env, consider offloading to a BackgroundTask/Thread
        client = GarminClient(garmin_data.garmin_email, garmin_data.garmin_password)
        success, status, error_msg = client.login(db=db)
        
        if not success:
            raise HTTPException(status_code=400, detail=f"Garmin login failed: {status}")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to Garmin: {str(e)}")
        
    # 2. Save credentials to user profile securely
    current_user.garmin_email = garmin_data.garmin_email
    current_user.garmin_password = garmin_data.garmin_password
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Garmin account connected successfully"}
