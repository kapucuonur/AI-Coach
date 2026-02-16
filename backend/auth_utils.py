"""
Authentication utilities for JWT token management.
Handles token creation, verification, and user authentication.
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging

logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production-VERY-IMPORTANT")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Security scheme for token authentication
security = HTTPBearer()


def create_access_token(email: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token for a user.
    
    Args:
        email: User's email address
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = {"sub": email}
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt


def verify_token(token: str) -> str:
    """
    Verify a JWT token and extract the user email.
    
    Args:
        token: JWT token string
        
    Returns:
        User email from token
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            logger.warning("Token verification failed: no email in payload")
            raise credentials_exception
            
        return email
        
    except JWTError as e:
        logger.warning(f"Token verification failed: {e}")
        raise credentials_exception


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    FastAPI dependency to get the current authenticated user's email from token.
    
    Usage:
        @router.get("/protected")
        def protected_route(email: str = Depends(get_current_user)):
            # email contains the authenticated user's email
            
    Returns:
        User email
        
    Raises:
        HTTPException: If token is missing or invalid
    """
    token = credentials.credentials
    email = verify_token(token)
    logger.info(f"Authenticated request from user: {email}")
    return email
