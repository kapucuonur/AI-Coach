from fastapi import APIRouter, HTTPException, Depends
from backend.services.garmin_client import GarminClient
from backend.services.garmin_charts import GarminChartManager
from backend.services.advanced_analytics import AdvancedAnalyticsManager
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
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error generating dashboard chart: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Chart Error: {str(e)}\n\nTraceback:\n{error_trace}")

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

# ==================== ADVANCED ANALYTICS ENDPOINTS ====================

@router.get("/analytics/injury-risk")
async def get_injury_risk_chart(client: GarminClient = Depends(get_garmin_client)):
    """Get Injury Risk Analysis Dashboard"""
    try:
        # For now, we use simulated data in the manager, or we could pass real history if implemented
        # To get real history, we'd fetching activities and parse them
        manager = AdvancedAnalyticsManager()
        # Passing None triggers data simulation
        img_data = manager.create_injury_risk_dashboard(df=None) 
        return {"chart": img_data, "format": "base64_png"}
    except Exception as e:
        logger.error(f"Error generating injury risk chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/race-pace")
async def get_race_pace_chart(client: GarminClient = Depends(get_garmin_client)):
    """Get Race Pace Calculator"""
    try:
        manager = AdvancedAnalyticsManager()
        img_data = manager.create_race_pace_calculator()
        return {"chart": img_data, "format": "base64_png"}
    except Exception as e:
        logger.error(f"Error generating race pace chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/swim-analysis")
async def get_advanced_swim_chart(client: GarminClient = Depends(get_garmin_client)):
    """Get Advanced Swim Stroke Analysis"""
    try:
        manager = AdvancedAnalyticsManager()
        img_data = manager.create_advanced_swim_analysis()
        return {"chart": img_data, "format": "base64_png"}
    except Exception as e:
        logger.error(f"Error generating swim analysis chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))
