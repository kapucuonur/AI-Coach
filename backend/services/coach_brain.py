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

    def generate_daily_advice(self, user_profile, activities_summary, health_stats, sleep_data, user_settings=None, todays_activities=None):
        """
        Generate daily coaching advice based on the user's data and settings.
        """
        
        # Prepare context strings
        activities_str = activities_summary.to_string() if hasattr(activities_summary, 'to_string') else str(activities_summary)
        
        # Format Today's Activities
        today_context = "No activities recorded today yet."
        if todays_activities and len(todays_activities) > 0:
            today_details = []
            for act in todays_activities:
                # Safely access dict keys or object attributes
                a_name = act.get('activityName', 'Unknown Activity')
                a_type = act.get('activityType', {}).get('typeKey', 'exercise') if isinstance(act.get('activityType'), dict) else 'exercise'
                a_dist = f"{act.get('distance', 0) / 1000:.2f} km"
                a_dur = f"{act.get('duration', 0) / 60:.0f} min"
                today_details.append(f"- {a_name} ({a_type}): {a_dist}, {a_dur}")
            
            today_context = "\n".join(today_details)

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
            if metrics.get("bike_max_power"):
                m_list.append(f"- Max Cycling Power: {metrics['bike_max_power']} Watts")
            if metrics.get("swim_pace_100m"):
                m_list.append(f"- Swim Pace: {metrics['swim_pace_100m']} /100m")
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
        
        **Activities Completed TODAY:**
        {today_context}

        **Recent Training Load (Last Week):**
        {activities_str}

        **Recovery Status (Today):**
        - Resting Heart Rate: {resting_hr}
        - Sleep Quality: {sleep_quality}
        - Sleep Score: {sleep_score}

        **Task:**
        Based on the data above, provide a concise daily briefing in {target_language}.
        1. Analyze their recovery status (Green/Yellow/Red).
        2. Evaluate their recent training load.
        3. **CRITICAL:** Check "Activities Completed TODAY". 
           - If they have ALREADY trained today (list is not empty), acknowledge the workout (e.g., "Great job on that run!").
           - If they trained, do NOT recommend another hard workout. Suggest recovery or "Optional double session" ONLY if they are elite.
           - If they haven't trained, recommend a specific workout for today.
        4. **Nutrition Strategy:**
            - **Pre-workout:** What to consume before the session.
            - **During:** Hydration and fueling needs (if applicable).
            - **Post-workout:** Recovery meal suggestion.
        5. Give a short motivational quote or tip.
        6. **MANDATORY FOOTER:** You MUST end the `advice_text` with this exact line (translated if needed): 
           *"Note to athlete: Please sync your device with Garmin Connect to ensure I have your latest data!"*

        **Guidelines:**
        - Use the user's performance metrics (Pace/Mac HR/FTP) to prescribe specific intensities.
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
            return self._clean_json_response(response.text)
        except Exception as e:
            logger.error(f"Failed to generate advice with Gemini: {e}")
            return '{"advice_text": "Sorry, I could not generate advice today.", "workout": null}'

    def generate_chat_response(self, messages, user_context=None, language="en"):
        """
        Generate a conversational response based on chat history and user context.
        """
        # Context building
        context_str = ""
        if user_context:
            context_str = f"User Context: {user_context}"
            
        language_map = {
            "en": "English", "tr": "Turkish", "de": "German", 
            "ru": "Russian", "fr": "French", "it": "Italian", "es": "Spanish"
        }
        target_language = language_map.get(language, "English")

        system_instruction = f"""
        You are an elite, empathetic, and data-driven sports coach.
        Your goal is to support the athlete's training, recovery, and mental state.
        
        {context_str}
        
        **Your Personality:**
        - Professional yet approachable.
        - Encouraging but realistic.
        - Data-informed (if data is provided).
        
        **Capabilities:**
        - You can answer questions about training, nutrition, and recovery.
        
        **Current Interaction:**
        The user has just logged in or is engaging with you. 
        If this is the start of the conversation, they might be answering your check-in question ("How are you feeling?").
        
        **CRITICAL RULE:**
        Respond ONLY in {target_language}. Do NOT use English unless the user's language is English.
        
        Respond naturally to the last message in the history. Keep responses concise.
        """
        
        try:
            # Convert messages to Gemini format if needed, or just append to prompt
            conversation_history = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            
            full_prompt = f"{system_instruction}\n\nChat History:\n{conversation_history}\n\nCoach:"
            
            logger.info(f"Sending chat request to Gemini (Language: {target_language})...")
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Failed to generate chat response: {e}")
            return "Connection error. Please try again."

    def generate_structured_plan(self, duration_str, user_profile, activities_summary, health_stats, user_settings):
        """
        Generate a structured training plan (JSON) for the dashboard.
        """
        # Prepare context
        activities_str = activities_summary.to_string() if hasattr(activities_summary, 'to_string') else str(activities_summary)
        
        # Extract settings
        sport = user_settings.get("primary_sport", "Endurance Sports")
        language = user_settings.get("language", "en")
        
        language_map = {
            "en": "English", "tr": "Turkish", "de": "German", 
            "ru": "Russian", "fr": "French", "it": "Italian", "es": "Spanish"
        }
        target_language = language_map.get(language, "English")
        
        # Build prompt
        prompt = f"""
        Act as an elite {sport} coach.
        Create a **{duration_str}** professional training plan for this athlete.
        
        **Athlete Context:**
        - Sport: {sport}
        - Recent Load: {activities_str}
        - Recovery: Resting HR {health_stats.get('restingHeartRate', 'N/A')}, Sleep {health_stats.get('sleepScore', 'N/A')}
        
        **Task:**
        Generate a highly detailed, professional-grade training plan.
        For every workout, you MUST provide structured steps (Warmup, Main Set, Cooldown) and specific intensity targets.
        
        **Targets:**
        - Running: Prescribe Pace (min/km) or Heart Rate Zone.
        - Cycling: Prescribe Power (Watts) or HR Zone.
        - Swimming: Prescribe Pace per 100m.
        
        **Output Format:**
        Return ONLY valid JSON with this structure:
        {{
            "title": "Title of the Block (e.g. Base Building 1)",
            "summary": "Strategic overview of the focus...",
            "weeks": [
                {{
                    "week_number": 1,
                    "focus": "Endurance & Force",
                    "total_distance": "approx 40km",
                    "total_tss": "approx 300",
                    "days": [
                        {{
                            "day_name": "Monday",
                            "activity_type": "Run", 
                            "workout_title": "4x8min Threshold Intervals",
                            "total_duration": "60 min",
                            "overview": "Key session to boost lactate threshold.",
                            "tss_estimate": 65,
                            "structure": {{
                                "warmup": {{ "duration": "15 min", "description": "Easy jog + dynamic drills", "target": "Zone 1-2" }},
                                "main_set": [
                                    {{ "repeats": 4, "duration": "8 min", "description": "Run at threshold effort", "target": "Pace: 4:15-4:20 min/km" }},
                                    {{ "repeats": 4, "duration": "2 min", "description": "Recovery jog", "target": "Zone 1" }}
                                ],
                                "cooldown": {{ "duration": "10 min", "description": "Easy flush", "target": "Zone 1" }}
                            }}
                        }}
                    ]
                }}
            ]
        }}
        
        **CRITICAL:**
        - The `days` array must contain 7 days per week.
        - Use "Rest" as activity_type for rest days (structure can be null).
        - Ensure the content is in **{target_language}**.
        - Do not encompass the JSON in code blocks. Just valid JSON.
        """
        
        try:
            logger.info("Generating professional structured plan...")
            response = self.model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            return self._clean_json_response(response.text)
        except Exception as e:
            logger.error(f"Failed to generate plan: {e}")
            return '{"error": "Failed to generate plan"}'

    def analyze_activity(self, activity_data, user_settings=None):
        """
        Analyze a specific activity in detail.
        """
        # Extract key metrics
        # 'get_activity' usually returns the top level dict as the summary
        summary = activity_data
        if 'summaryDTO' in activity_data:
             summary = activity_data['summaryDTO']
        
        name = summary.get('activityName', 'Activity')
        type_key = summary.get('activityType', {}).get('typeKey', 'exercise') if isinstance(summary.get('activityType'), dict) else 'exercise'
        dist = summary.get('distance', 0) or 0
        dist_km = dist / 1000
        duration = summary.get('duration', 0) or 0
        duration_min = duration / 60
        avg_hr = summary.get('averageHR', 'N/A')
        max_hr = summary.get('maxHR', 'N/A')
        avg_speed = summary.get('averageSpeed', 0) or 0 # m/s usually
        
        # approximate pace calculation (min/km)
        avg_pace_str = "N/A"
        if avg_speed > 0:
             pace_per_km_sec = 1000 / avg_speed
             p_min = int(pace_per_km_sec // 60)
             p_sec = int(pace_per_km_sec % 60)
             avg_pace_str = f"{p_min}:{p_sec:02d} /km"

        # Laps/Splits context
        splits_context = ""
        splits_data = activity_data.get('splits', {})
        laps = []
        if isinstance(splits_data, dict) and 'lapDTOs' in splits_data:
             laps = splits_data['lapDTOs']
        elif isinstance(splits_data, list):
             laps = splits_data
             
        if laps:
             splits_context = "Splits/Laps (First 10):\n"
             for i, lap in enumerate(laps[:10]):
                  l_dur = lap.get('duration', 0)
                  l_dist = lap.get('distance', 0)
                  l_hr = lap.get('averageHR', 'N/A')
                  l_speed = lap.get('averageSpeed', 0)
                  l_pace = "N/A"
                  if l_speed > 0:
                      l_p_sec = 1000 / l_speed
                      l_pace = f"{int(l_p_sec//60)}:{int(l_p_sec%60):02d}"
                  
                  splits_context += f"- Lap {i+1}: {l_dist:.0f}m in {l_dur:.0f}s, Avg HR {l_hr}, Pace {l_pace}\n"

        # Settings for personalization
        sport_context = "Endurance Sports"
        language_code = "en"
        if user_settings:
            sport_context = user_settings.get("primary_sport", "Endurance Sports")
            language_code = user_settings.get("language", "en")
            
        language_map = {
            "en": "English", "tr": "Turkish", "de": "German", 
            "ru": "Russian", "fr": "French", "it": "Italian", "es": "Spanish"
        }
        target_language = language_map.get(language_code, "English")

        prompt = f"""
        Act as an elite {sport_context} coach.
        Analyze this specific workout: "{name}" ({type_key}).
        
        **Data for {name}:**
        - Total Distance: {dist_km:.2f} km
        - Total Duration: {duration_min:.1f} min
        - Avg HR: {avg_hr} bpm (Max: {max_hr})
        - Avg Pace/Speed: {avg_pace_str}
        
        {splits_context}
        
        **Task:**
        Provide a short, high-value analysis of this session in {target_language}.
        1. **Effort Analysis:** Was it executed well? (e.g. "Solid steady state", "Good interval execution", "Recovery pace maintained").
        2. **Physiological Insight:** Comment on Heart Rate vs Pace/Power if possible.
        3. **Key Takeaway:** One specific thing to improve or maintain.
        
        Keep it concise (3-5 sentences). Do not use markdown headers like ##. Just paragraphs.
        """
        
        try:
            logger.info(f"Analyzing activity {name} with Gemini...")
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Failed to analyze activity: {e}")
            return "Could not analyze activity."

    def _clean_json_response(self, response_text):
        """
        Helper to strip markdown code blocks from JSON response.
        """
        cleaned = response_text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return cleaned.strip()

if __name__ == "__main__":
    # simple test
    try:
        brain = CoachBrain()
        print("Brain initialized.")
    except Exception as e:
        print(f"Error: {e}")
