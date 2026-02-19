from fastapi import APIRouter, HTTPException, Depends
from backend.services.garmin_client import GarminClient
from backend.routers.dashboard import get_garmin_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/devices")
def get_devices(client: GarminClient = Depends(get_garmin_client)):
    """Fetch available Garmin devices."""
    try:
        devices = client.get_devices()
        return devices
    except Exception as e:
        logger.error(f"Error fetching devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))
