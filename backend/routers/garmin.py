from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import date
from backend.services.garmin_client import GarminClient
from backend.routers.dashboard import get_garmin_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

    except Exception as e:
        logger.error(f"Error fetching devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices")
def get_devices(request: Request):
    """Fetch available Garmin devices."""
    try:
        client = get_garmin_client(request)
        if not client:
            raise HTTPException(status_code=401, detail="Garmin client not authenticated")
        
        devices = client.get_devices()
        return devices
    except Exception as e:
        logger.error(f"Error fetching devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats/yearly")
def get_yearly_stats(request: Request):
    """Get yearly activity statistics."""
    try:
        client = get_garmin_client(request)
        if not client:
            raise HTTPException(status_code=401, detail="Garmin client not authenticated")
        
        # Default to last 5 years
        start_year = date.today().year - 5
        stats = client.get_yearly_stats(start_year)
        return stats
    except Exception as e:
        logger.error(f"Error fetching yearly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
