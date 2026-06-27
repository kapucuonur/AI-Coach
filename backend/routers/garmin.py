from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import date
from backend.services.garmin_client import GarminClient
from backend.routers.dashboard import get_garmin_client
from backend.database import get_db
from backend.auth_utils import get_current_user
from backend.models import User, UserSetting
from sqlalchemy.orm import Session
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


import asyncio

@router.get("/devices")
async def get_devices(client: GarminClient = Depends(get_garmin_client)):
    """Fetch available Garmin devices."""
    try:
        devices = await asyncio.to_thread(client.get_devices)
        return devices
    except Exception as e:
        logger.error(f"Error fetching devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/yearly")
async def get_yearly_stats(
    years: int = 5,
    client: GarminClient = Depends(get_garmin_client),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get yearly activity statistics."""
    try:
        # 1. Check DB Cache first (TTL: 24 hours)
        setting = db.query(UserSetting).filter(
            UserSetting.user_id == current_user.id,
            UserSetting.key == "cache_yearly_stats"
        ).first()

        force_refresh = False
        if setting and setting.value and not force_refresh:
            cached_data = setting.value
            timestamp = cached_data.get("timestamp", 0)
            if time.time() - timestamp < 86400:  # 24 hours
                logger.info(f"Serving /stats/yearly from DB cache for {current_user.email}")
                return cached_data.get("data", {})
                
        start_year = date.today().year - years
        stats = await asyncio.to_thread(client.get_yearly_stats, start_year)
        
        # Save payload to DB cache
        try:
            if not setting:
                setting = UserSetting(user_id=current_user.id, key="cache_yearly_stats")
                db.add(setting)
            setting.value = {"timestamp": time.time(), "data": stats}
            db.commit()
            logger.info(f"Saved /stats/yearly to DB cache for {current_user.email}")
        except Exception as cache_err:
            logger.error(f"Failed to save yearly stats cache: {cache_err}")
            db.rollback()
            
        return stats
    except Exception as e:
        logger.error(f"Error fetching yearly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
