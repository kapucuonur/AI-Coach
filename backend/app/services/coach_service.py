
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.config import GEMINI_API_KEY
from app.models import User, Activity
from typing import List, Optional, Dict, Any
import json
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CoachService:
    def __init__(self, db: Session):
        self.db = db
        if GEMINI_API_KEY:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    def _get_user_context(self, user_id: int) -> dict:
        user = self.db.query(User).filter(User.id == user_id).first()
        activities = self.db.query(Activity).filter(
            Activity.user_id == user_id
        ).order_by(Activity.start_time.desc()).limit(10).all()

        activity_summary = []
        for act in activities:
            activity_summary.append({
                "date": act.start_time.strftime("%Y-%m-%d"),
                "type": act.sport_type or "Virtual Ride",
                "distance_km": act.distance_m / 1000,
                "duration_min": act.duration_seconds / 60,
                "avg_power": act.avg_power,
                "avg_hr": act.avg_hr,
                "tss": act.tss
            })

        return {
            "name": user.full_name,
            "weight_kg": user.weight_kg,
            "ftp": user.ftp_watts,
            "max_hr": user.max_hr,
            "recent_activities": activity_summary
        }

    async def get_daily_advice(self, user_id: int) -> str:
        """
        Generates a quick daily tip based on recovery and recent load.
        """
        if not self.model:
            return "Gemini API key not configured."

        context = self._get_user_context(user_id)
        
        prompt = f"""
        You are a World-Class Endurance Coach using the 'VirtuRide' platform.
        User context: {json.dumps(context)}
        
        Analyze the user's recent training load (TSS) and provide a 2-3 sentence daily briefing.
        - If high fatigue (high recent TSS), suggest recovery or light spin.
        - If fresh, suggest a specific workout type (e.g., "Threshold Intervals").
        - Be professional, motivating, and specific to their FTP ({context.get('ftp')}W).
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Coach is offline: {str(e)}"

    async def chat_with_coach(self, user_id: int, message: str) -> str:
        """
        Interactive chat with the coach, context-aware of user's physiology.
        """
        if not self.model:
            return "Gemini API key not configured."

        context = self._get_user_context(user_id)
        
        prompt = f"""
        You are an elite cycling and triathlon coach.
        User Profile: {json.dumps(context)}
        User Message: "{message}"
        
        **Your Personality:**
        - Professional, scientific, yet accessible.
        - Use sport-specific terminology (Power, Cadence, TSS for cycling; Pace for running).
        - If asked for a plan, refer to specific Power Zones based on FTP ({context.get('ftp')}W).
        
        Answer the user's question accurately.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"

    async def generate_training_plan(self, user_id: int, weeks: int = 4, focus: str = "FTP Builder") -> Dict[str, Any]:
        """
        Generates a structured JSON training plan.
        """
        if not self.model:
            return {"error": "Gemini API key not configured."}

        context = self._get_user_context(user_id)
        
        prompt = f"""
        Create a {weeks}-week {focus} training plan for this athlete.
        Profile: {json.dumps(context)}
        
        **Output Format:**
        Provide ONLY valid JSON. Structure:
        {{
            "plan_name": "{focus}",
            "weeks": [
                {{
                    "week_number": 1,
                    "focus": "Base / Build / etc",
                    "days": [
                        {{
                            "day": "Monday",
                            "activity": "Rest" or "Virtual Ride",
                            "description": "Details about the workout",
                            "duration_min": 60,
                            "type": "Recovery" / "Intervals" / "Endurance"
                        }}
                    ]
                }}
            ]
        }}
        
        Ensure workouts are scaled to their FTP ({context.get('ftp')}W).
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return self._clean_json_response(response.text)
        except Exception as e:
            logger.error(f"Plan generation failed: {e}")
            return {"error": "Failed to generate plan"}

    async def analyze_activity(self, activity_id: int) -> str:
        """
        Deep dive analysis into a specific activity.
        """
        if not self.model:
            return "Gemini API key not configured."

        activity = self.db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            return "Activity not found."

        # Construct detailed context
        act_data = {
            "type": activity.sport_type,
            "date": activity.start_time.strftime("%Y-%m-%d"),
            "distance": activity.distance_m,
            "duration": activity.duration_seconds,
            "avg_power": activity.avg_power,
            "max_power": activity.max_power,
            "avg_hr": activity.avg_hr,
            "max_hr": activity.max_hr,
            "avg_cadence": activity.avg_cadence,
            "tss": activity.tss
        }

        prompt = f"""
        Analyze this specific workout in detail.
        Data: {json.dumps(act_data)}
        
        Provide a professional post-workout analysis:
        1. **Execution**: How was the pacing/intensity?
        2. **Physiological Benefit**: What energy systems were improved?
        3. **Form/Technique**: Commentary on cadence ({act_data.get('avg_cadence')} rpm).
        4. **Coach's Verdict**: One specific thing to improve next time.
        
        Use the data to back up your claims.
        """

        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Analysis failed: {str(e)}"

    def _clean_json_response(self, response_text: str):
        """Helper to strict markdown code blocks from JSON response."""
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        try:
            return json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {"error": "Invalid JSON from AI", "raw": cleaned}
