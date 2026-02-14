
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.config import GEMINI_API_KEY
from app.models import User, Activity
from typing import List, Optional
import json

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
        ).order_by(Activity.start_time.desc()).limit(5).all()

        activity_summary = []
        for act in activities:
            activity_summary.append({
                "date": act.start_time.strftime("%Y-%m-%d"),
                "type": "Virtual Ride",
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
            "recent_activities": activity_summary
        }

    async def get_daily_advice(self, user_id: int) -> str:
        if not self.model:
            return "Gemini API key not configured."

        context = self._get_user_context(user_id)
        
        prompt = f"""
        You are a professional cycling coach using the 'VirtuRide' platform.
        User context: {json.dumps(context)}
        
        Analyze the user's recent activities and provide a brief, motivating daily advice.
        Focus on recovery if they have high TSS, or suggest a workout if they are fresh.
        Keep it under 3 sentences. Professional but encouraging tone.
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Coach is offline: {str(e)}"

    async def chat_with_coach(self, user_id: int, message: str) -> str:
        if not self.model:
            return "Gemini API key not configured."

        context = self._get_user_context(user_id)
        
        prompt = f"""
        You are an elite cycling coach.
        User Profile: {json.dumps(context)}
        User Message: "{message}"
        
        Answer the user's question based on their profile and recent activities.
        Be specific, scientific yet accessible. If they ask about training plans, suggest specific power zones based on their FTP ({context.get('ftp', 'unknown')}W).
        """
        
        try:
            response = await self.model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            return f"Error: {str(e)}"
