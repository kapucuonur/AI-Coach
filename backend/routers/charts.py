from fastapi import APIRouter, HTTPException, Depends
from backend.services.garmin_client import GarminClient
from backend.services.garmin_charts import GarminChartManager
from backend.routers.dashboard import get_garmin_client # Reuse helper
import logging
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# Cache manager instance mostly for connection reuse if needed,
# but since we get 'client' from dependency, we instantiate Manager per request mostly.
# Or we can reuse the logic.

@router.get("/dashboard")
async def get_dashboard_chart(days: int = 30, client: GarminClient = Depends(get_garmin_client)):
    """Get performance dashboard as base64 image"""
    try:
        # Create manager using existing authenticated client
        # We access the internal 'garminconnect.Garmin' object via client.client
        manager = GarminChartManager(client=client.client)
        img_data = manager.create_performance_dashboard(days)
        return {
            "chart": img_data, 
            "format": "base64_png",
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error generating dashboard chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity/{activity_id}")
async def get_activity_chart(activity_id: int, client: GarminClient = Depends(get_garmin_client)):
    """Get single activity analysis"""
    try:
        manager = GarminChartManager(client=client.client)
        img_data = manager.create_workout_analysis(activity_id)
        return {"chart": img_data, "format": "base64_png"}
    except Exception as e:
        logger.error(f"Error generating activity chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/health")
async def get_health_data(days: int = 30, client: GarminClient = Depends(get_garmin_client)):
    """Get raw health data as JSON for custom frontend charts"""
    try:
        manager = GarminChartManager(client=client.client)
        df = manager.fetch_health_data(days)
        # Convert date to string for JSON serialization
        if not df.empty:
            df['date'] = df['date'].dt.strftime('%Y-%m-%d')
            return df.to_dict(orient='records')
        return []
    except Exception as e:
        logger.error(f"Error fetching health data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
