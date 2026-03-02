import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY environment variable is not set!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt requires bytes, so we encode strings to utf-8 first
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    # Hash the password and return it as a string
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from backend.models import User
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# --- Garmin Password Encryption ---
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)
ENCRYPT_KEY = os.getenv("FIELD_ENCRYPT_KEY")

def get_fernet():
    if not ENCRYPT_KEY:
        raise ValueError("FIELD_ENCRYPT_KEY environment variable is not set! Required for Garmin password encryption.")
    # Ensure key is bytes
    key = ENCRYPT_KEY.encode() if isinstance(ENCRYPT_KEY, str) else ENCRYPT_KEY
    return Fernet(key)

def encrypt_garmin_password(password: str) -> str:
    """Encrypts a plaintext Garmin password for database storage."""
    if not password:
        return password
    try:
        f = get_fernet()
        return f.encrypt(password.encode('utf-8')).decode('utf-8')
    except Exception as e:
        logger.error(f"Failed to encrypt password: {e}")
        raise ValueError("Encryption failed")

def decrypt_garmin_password(encrypted_password: str) -> str:
    """Decrypts a stored Garmin password for API usage. Safely falls back if plaintext."""
    if not encrypted_password:
        return encrypted_password
    try:
        f = get_fernet()
        return f.decrypt(encrypted_password.encode('utf-8')).decode('utf-8')
    except Exception:
        # If decryption fails, it might be an older plaintext password
        return encrypted_password


# --- Centralized Premium Check ---
def is_user_premium(user) -> bool:
    """Central logic to determine if a user has access to premium features (Subscription or Trial)."""
    if getattr(user, 'is_premium', False):
        return True
    
    # 7-day free trial logic
    if user.created_at:
        trial_end = user.created_at + timedelta(days=7)
        if datetime.utcnow() < trial_end:
            return True
            
    return False
