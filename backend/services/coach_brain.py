import os
import logging
import google.generativeai as genai
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

class CoachBrain:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.error("GEMINI_API_KEY not found in environment variables.")
            raise ValueError("GEMINI_API_KEY is missing.")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def generate_daily_advice(self, user_profile, activities_summary, health_stats, sleep_data, user_settings=None):
        """
        Generate daily coaching advice based on the user's data and settings.
        """
        
        # Prepare context strings
        activities_str = activities_summary.to_string() if hasattr(activities_summary, 'to_string') else str(activities_summary)
        
        # Extract specific data points safely
        name = user_profile.get('fullName', 'Athlete') if user_profile else 'Athlete'
        vo2max = user_profile.get('vo2MaxRunning', 'N/A') if user_profile else 'N/A'
        
        resting_hr = health_stats.get('restingHeartRate', 'N/A') if health_stats else 'N/A'
        
        sleep_quality = 'N/A'
        sleep_score = 'N/A'
        if sleep_data and 'dailySleepDTO' in sleep_data:
            sleep_quality = sleep_data['dailySleepDTO'].get('sleepQualityType', 'N/A')
            sleep_score = sleep_data['dailySleepDTO'].get('sleepScore', 'N/A')

        # Settings Context
        sport_context = "Endurance Sports"
        race_context = "No specific upcoming races."
        language_code = "en"
        language_map = {
            "en": "English", "tr": "Turkish", "de": "German", 
            "ru": "Russian", "fr": "French", "it": "Italian", "es": "Spanish"
        }
        
        # Advanced Metrics defaults
        profile_context = ""
        metrics_context = ""
        strength_context = ""

        if user_settings:
            sport_context = user_settings.get("primary_sport", "Endurance Sports")
            language_code = user_settings.get("language", "en")
            
            # Profile Stats
            age = user_settings.get("age")
            gender = user_settings.get("gender")
            if age or gender:
                profile_context = f"- Age: {age or 'N/A'}\n        - Gender: {gender or 'N/A'}"

            # Strength Training
            s_days = user_settings.get("strength_days", 0)
            if s_days > 0:
                strength_context = f"Include {s_days} days of Strength/Gym training per week in the schedule. Balance this with endurance work."

            # Sport Metrics
            metrics = user_settings.get("metrics", {})
            m_list = []
            if metrics.get("threshold_pace"):
                m_list.append(f"- Threshold Running Pace: {metrics['threshold_pace']} min/km")
            if metrics.get("ftp"):
                m_list.append(f"- Cycling FTP: {metrics['ftp']} Watts")
            if metrics.get("max_hr"):
                m_list.append(f"- Max Heart Rate: {metrics['max_hr']} bpm")
            
            if m_list:
                metrics_context = "**Performance Metrics:**\n        " + "\n        ".join(m_list)

            races = user_settings.get("races", [])
            if races:
                # Format races
                race_list = []
                from datetime import datetime
                today = datetime.now()
                
                for r in races:
                    try:
                        race_date = datetime.strptime(r['date'], "%Y-%m-%d")
                        days_to_race = (race_date - today).days
                        if days_to_race >= 0:
                            race_list.append(f"- {r['name']} ({r['date']}): {days_to_race} days away")
                    except:
                        race_list.append(f"- {r['name']} ({r['date']})")
                
                if race_list:
                    race_context = "Upcoming Races:\n" + "\n".join(race_list)

        target_language = language_map.get(language_code, "English")

        prompt = f"""
        You are an elite {sport_context} coach with expertise in exercise physiology and data analysis.
        Act as a personal coach for the following athlete:

        **Athlete Profile:**
        - Name: {name}
        - VO2max: {vo2max}
        - Primary Sport: {sport_context}
        {profile_context}

        {metrics_context}

        **Race Schedule:**
        {race_context}

        **Recent Training Load (Last Week):**
        {activities_str}

        **Recovery Status (Today):**
        - Resting Heart Rate: {resting_hr}
        - Sleep Quality: {sleep_quality}
        - Sleep Score: {sleep_score}

        **Task:**
        Based on the data above, provide a concise daily briefing in {target_language}.
        1. Analyze their recovery status (Green/Yellow/Red).
        2. Evaluate their recent training load in context of their sport, metrics, and upcoming races.
        3. Recommend a specific workout for today (or rest if needed).
        4. **Nutrition Strategy:**
            - **Pre-workout:** What to consume before the session.
            - **During:** Hydration and fueling needs (if applicable).
            - **Post-workout:** Recovery meal suggestion.
        5. Give a short motivational quote or tip.

        **Guidelines:**
        - Use the user's performance metrics (Pace/Mac HR/FTP) to prescribe specific intensities (e.g., "Run at {metrics.get('threshold_pace', 'threshold')} pace" or "Ride at {metrics.get('ftp', '')} Watts").
        - {strength_context}
        - Output ONLY in {target_language}.

        **Format:**
        Return a JSON object with this structure:
        {{
            "advice_text": "Markdown formatted advice string...",
            "workout": {{
                "workoutName": "AI Coach - Tempo Run",
                "sportType": {{ "sportTypeId": 1, "sportTypeKey": "running" }},
                "description": "AI Generated workout",
                "steps": [
                    {{
                        "type": "ExecutableStepDTO",
                        "stepOrder": 1,
                        "childStepId": null,
                        "description": "Warmup",
                        "stepType": {{ "stepTypeId": 1, "stepTypeKey": "warmup" }},
                        "endCondition": {{ "conditionTypeId": 2, "conditionTypeKey": "time" }},
                        "endConditionValue": 600,
                        "targetType": {{ "targetTypeId": 4, "targetTypeKey": "heart.rate.zone" }},
                        "targetValueOne": 1,
                        "targetValueTwo": 2
                    }}
                ]
            }}
        }}
        
        IMPORTANT: The 'workout' field is optional. If today is rest day, set "workout": null.
        Output ONLY valid JSON.
        """
        
        try:
            logger.info("Sending request to Gemini...")
            response = self.model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            return response.text
        except Exception as e:
            logger.error(f"Failed to generate advice with Gemini: {e}")
            return '{"advice_text": "Sorry, I could not generate advice today.", "workout": null}'
        except Exception as e:
            logger.error(f"Failed to generate advice with Gemini: {e}")
            return "Sorry, I couldn't generate your coaching advice today. Please check your API key and connection."

if __name__ == "__main__":
    # simple test
    try:
        brain = CoachBrain()
        print("Brain initialized.")
    except Exception as e:
        print(f"Error: {e}")
