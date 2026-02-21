from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.database import get_db
from backend.models import User
from backend.auth_utils import verify_password, get_password_hash, create_access_token

router = APIRouter(tags=["auth"])

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class GarminConnectRequest(BaseModel):
    garmin_email: str
    garmin_password: str

class GarminMFARequest(BaseModel):
    garmin_email: str
    mfa_code: str

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
    
    try:
        client = GarminClient(garmin_data.garmin_email, garmin_data.garmin_password)
        success, login_status, error_msg = client.login(db=db)
        
        if not success:
            if login_status == "MFA_REQUIRED":
                # MFA is needed — return a 200 with status so the frontend can show a code input
                return {
                    "status": "MFA_REQUIRED",
                    "message": error_msg or "Please enter the authentication code sent to your email.",
                    "garmin_email": garmin_data.garmin_email
                }
            raise HTTPException(status_code=400, detail=f"Garmin login failed: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to Garmin: {str(e)}")
        
    # Login succeeded without MFA — save credentials
    current_user.garmin_email = garmin_data.garmin_email
    current_user.garmin_password = garmin_data.garmin_password
    
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return {"status": "SUCCESS", "message": "Garmin account connected successfully"}


@router.post("/connect-garmin/mfa")
def connect_garmin_mfa(
    mfa_data: GarminMFARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit MFA code to complete Garmin login."""
    from backend.services.garmin_client import GarminClient
    
    try:
        client = GarminClient(mfa_data.garmin_email)
        success, login_status, error_msg = client.login(db=db, mfa_code=mfa_data.mfa_code)
        
        if not success:
            raise HTTPException(status_code=400, detail=f"MFA verification failed: {error_msg}")
        
        # MFA succeeded — save credentials
        # We need the password too; it's stored in the PENDING_SESSION's GarminClient
        current_user.garmin_email = mfa_data.garmin_email
        # The password was already set during the initial /connect-garmin call
        # Retrieve it from the client if available
        if client.password and client.password != "session_restore_placeholder":
            current_user.garmin_password = client.password
        
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
        return {"status": "SUCCESS", "message": "Garmin account connected successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"MFA verification failed: {str(e)}")
