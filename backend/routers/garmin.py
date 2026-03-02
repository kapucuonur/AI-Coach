from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import date
from backend.services.garmin_client import GarminClient
from backend.routers.dashboard import get_garmin_client
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
    client: GarminClient = Depends(get_garmin_client)
):
    """Get yearly activity statistics."""
    try:
        start_year = date.today().year - years
        stats = await asyncio.to_thread(client.get_yearly_stats, start_year)
        return stats
    except Exception as e:
        logger.error(f"Error fetching yearly stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
