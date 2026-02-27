import os
import logging
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

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
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def generate_daily_advice(self, user_profile, activities_summary, health_stats, sleep_data, user_settings=None, todays_activities=None, client_local_time=None, available_time_mins=None):
        """
        Generate daily coaching advice based on the user's data and settings.
        """
        
        # Calculate time context
        current_hour = 9 # Default to morning if unknown
        time_context_str = "Unknown time of day"
        if client_local_time:
            try:
                # Basic ISO parsing (e.g., 2026-02-12T19:47:28.000Z)
                from datetime import datetime
                # Handle potential trailing Z or offsets rudimentarily if needed
                cleaned_time = client_local_time.replace('Z', '+00:00')
                dt = datetime.fromisoformat(cleaned_time)
                current_hour = dt.hour
                time_context_str = f"{current_hour:02d}:{dt.minute:02d}"
            except Exception as e:
                logger.warning(f"Could not parse client time {client_local_time}: {e}")
                pass

        is_evening = current_hour >= 18
        
        is_rest_day = False
        today_name = "Unknown"
        if client_local_time:
            try:
                from datetime import datetime
                cleaned_time = client_local_time.replace('Z', '+00:00')
                dt = datetime.fromisoformat(cleaned_time)
                today_name = dt.strftime('%A')
                off_days = user_settings.get("off_days", []) if user_settings else []
                if today_name in off_days:
                    is_rest_day = True
            except:
                pass
        
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
                a_dist = f"{float(act.get('distance', 0) or 0) / 1000:.2f} km"
                a_dur = f"{float(act.get('duration', 0) or 0) / 60:.0f} min"
                today_details.append(f"- {a_name} ({a_type}): {a_dist}, {a_dur}")
            
            today_context = "\n".join(today_details)

        # Extract specific data points safely
        name = user_profile.get('fullName', 'Athlete') if user_profile else 'Athlete'
        vo2max = user_profile.get('vo2MaxRunning', 'N/A') if user_profile else 'N/A'
        fitness_age = user_profile.get('fitnessAge', 'N/A') if user_profile else 'N/A'
        
        resting_hr = health_stats.get('restingHeartRate', 'N/A') if health_stats else 'N/A'
        
        sleep_quality = 'N/A'
        sleep_score = 'N/A'
        if sleep_data and 'dailySleepDTO' in sleep_data:
            sleep_quality = sleep_data['dailySleepDTO'].get('sleepQualityType', 'N/A')
            sleep_score = sleep_data['dailySleepDTO'].get('sleepScore', 'N/A')
            
        stress = health_stats.get('averageStressLevel', 'N/A') if health_stats else 'N/A'
        body_battery = health_stats.get('bodyBatteryHighestValue', 'N/A') if health_stats else 'N/A'

        # Settings Context
        sport_context = "Endurance Sports"
        race_context = "No specific upcoming races."
        goals_context = ""
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
            also_runs = user_settings.get("also_runs", True)
            language_code = user_settings.get("language", "en")
            
            # Profile Stats
            age = user_settings.get("age")
            gender = user_settings.get("gender")
            if age or gender:
                profile_context = f"- Age: {age or 'N/A'}\n        - Gender: {gender or 'N/A'}"

            # Strength Training
            s_days = user_settings.get("strength_days", 0)
            if s_days > 0:
                strength_context = f"Include {s_days} days of Strength/Gym training per week. Balance with endurance."

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

            # Goals Context
            goals = user_settings.get("goals", {})
            if goals:
                g_list = []
                for sport_key, goal_val in goals.items():
                    if goal_val:
                        g_list.append(f"- {sport_key.capitalize()} Goal: {goal_val}")
                
                if g_list:
                    goals_context = "**Current Training Targets:**\n        " + "\n        ".join(g_list)

        target_language = language_map.get(language_code, "English")

        time_limit_str = f"- **Time Constraint**: The athlete has specified they only have {available_time_mins} minutes to train today. YOU MUST fit the overall recommended workout duration strictly within this time limit." if available_time_mins is not None else ""
        
        rest_day_instruction = ""
        if is_rest_day:
            rest_day_instruction = f"\\n        - **CRITICAL**: Today ({today_name}) is explicitly marked as an OFF DAY (Rest Day) in the athlete's settings. You MUST NOT prescribe any active workout. Your workout recommendation must be strictly rest, light stretching, or recovery. Provide `null` for the workout JSON or a pure rest day JSON."

        prompt = f"""
        You are an elite, world-class Performance Coach and Sports Scientist.
        Your athlete relies on you for deep, data-driven insights and rigorous training protocols.
        Your tone is highly professional, analytical, direct, and authoritative, yet inspiring.
        
        **Athlete Profile:**
        - Name: {name}
        - VO2max: {vo2max} ml/kg/min (Fitness age: {fitness_age})
        - Sport: {sport_context}
        - Runs: {"Yes" if also_runs else "No"}
        {profile_context}
        {metrics_context}
        {goals_context}

        **Current Context:**
        - Local Time: {time_context_str}
        - Race Schedule: {race_context}
        {time_limit_str}{rest_day_instruction}
        
        **Data Snapshot:**
        - Resting HR: {resting_hr} bpm
        - Sleep: {sleep_score}/100 ({sleep_quality})
        - Stress Level: {stress}
        - Body Battery: {body_battery}
        - Recent Load: {activities_str}
        - Completed Today: {today_context}

        **Task:**
        Generate a highly rigorous, professional Daily Briefing. 
        
        **CRITICAL LANGUAGE INSTRUCTION: YOU MUST WRITE THE ENTIRE BRIEFING IN {target_language.upper()}!** 
        ALL text, sentences, guidance, and markdown headers MUST be translated into {target_language}. DO NOT output English text if {target_language} is not English!

        **Structure Details (Format this structure into {target_language}, applying rich markdown like bolding and lists):**
        1. **生理 Analytics & Readiness (Physiological Analytics & Readiness)**: Start with an emoji status (🟢 Optimal / 🟡 Marginal / 🔴 Suppressed). Provide a deep, 2-3 sentence analysis of their readiness based on their Sleep, HRV/Resting HR, and Body Battery. Don't just list the numbers; explain what they mean for their central nervous system and capacity for strain today.
        2. **Training Directive (Training Directive)**: A concise paragraph analyzing their recent load and defining the precise objective for today's session (e.g., aerobic maintenance, lactate clearance, neuromuscular recruitment).
        3. **Protocol (Workout of the Day)**: Provide your specific workout recommendation based on the current context.
           - OVERTRAINING PROTECTION (CRITICAL): If the athlete has already completed >= 2 sessions today, OR if the total duration of today's training exceeds 90 minutes, YOU MUST PRESCRIBE TOTAL REST. Professional athletes need recovery. Provide `null` for the workout JSON.
           - IF trained today already (but < 90 mins): Prescribe active recovery, mobility, or total rest. Double sessions only if they are clearly an elite athlete with high capacity.
           - IF not trained yet: If it's late evening (local time >= 18:00), prescribe mobility/yoga/rest. Otherwise, prescribe a structured session.
           - CYCLING RESTRICTION: No running if "Runs: No", only cycle, stretch, strength, or rest.
           - PRO METRICS: Must include target metric: Pace, HR Zone, Power (Watts), etc. based on sport. Warmup/Main Set/Cooldown required in the JSON workout section if providing an active workout.
        4. **Fueling Strategy (Nutrition)**: Actionable, precise bullet points for Pre-workout, Intra-workout (if applicable), and Post-workout macronutrient focus.
        5. **Coach's Note (Mindset)**: One punchy, highly professional psychological framing for the day.

        **Output Format:**
        JSON object:
        {{
            "advice_text": "Markdown string...",
            "workout": {{
                "workoutName": "AI Coach - Duration/Type",
                "sportType": {{ "sportTypeId": 1, "sportTypeKey": "running" }},
                "description": "Short description",
                "workoutSegments": [
                    {{
                        "sportType": {{ "sportTypeId": 1, "sportTypeKey": "running" }},
                        "workoutSteps": [
                            {{
                                "type": "ExecutableStepDTO",
                                "description": "Warmup",
                                "stepType": {{ "stepTypeId": 1, "stepTypeKey": "warmup" }},
                                "endCondition": {{ "conditionTypeId": 2, "conditionTypeKey": "time" }},
                                "preferredEndConditionUnit": null,
                                "endConditionValue": 600,
                                "targetType": {{ "workoutTargetTypeId": 4, "workoutTargetTypeKey": "heart.rate.zone" }},
                                "targetValueOne": 1, 
                                "targetValueTwo": 2,
                                "zoneNumber": null
                            }},
                            {{
                                "type": "ExecutableStepDTO",
                                "description": "Main Set",
                                "stepType": {{ "stepTypeId": 3, "stepTypeKey": "active" }},
                                "endCondition": {{ "conditionTypeId": 2, "conditionTypeKey": "time" }},
                                "preferredEndConditionUnit": null,
                                "endConditionValue": 1200,
                                "targetType": {{ "workoutTargetTypeId": 4, "workoutTargetTypeKey": "heart.rate.zone" }},
                                "targetValueOne": 3, 
                                "targetValueTwo": 4,
                                "zoneNumber": null
                            }}
                        ]
                    }}
                ]
            }}
        }}
        
        **CRITICAL GARMIN WORKOUT JSON RULES:**
        You must strictly adhere to the specific Garmin ID and Key mappings for workouts:
        - `sportType`: running (1), cycling (2), swimming (5), strength_training (9)
        - `stepType`: warmup (1), cooldown (2), active (3), rest (4), recovery (5)
        - `endCondition`: lap.button (1), time (2) [value in seconds], distance (3) [value in meters]
        - `targetType` for Running: heart.rate.zone (4), pace.zone (2) 
        - `targetType` for Cycling: power.zone (6), heart.rate.zone (4), cadence.zone (5)
        - Do not output target values as strings, they MUST be numeric/integers (e.g. `targetValueOne`: 1).
        - IF NO TARGET: use `no.target` (1). CRITICAL: If using no.target, you MUST OMIT the `targetValueOne`, `targetValueTwo`, and `zoneNumber` fields completely from that step's JSON. Sending them as null causes a server crash.
        - CRITICAL: DO NOT include `segmentOrder` or `stepOrder` anywhere in the JSON. Garmin will reject the upload if you do.
        - CRITICAL: The `workoutSegments` array MUST contain ALWAYS exactly ONE item (one segment map). You must place ALL `workoutSteps` sequentially inside that single piece of segment logic. Do NOT create multiple segment items. Garmin API crashes if multiple segments are used for running/cycling.
        (Set "workout": null if it's a rest day/evening. Workout steps should be valid Garmin JSON structure.)
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
            conversation_history = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
            full_prompt = f"{system_instruction}\n\nChat History:\n{conversation_history}\n\nCoach:"
            logger.info(f"Sending chat request to Gemini (Language: {target_language})...")
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            logger.error(f"Failed to generate chat response: {e}")
            return "Connection error. Please try again."

    def generate_structured_plan(self, duration_str, user_profile, activities_summary, health_stats, sleep_data=None, user_settings=None):
        """
        Generate a structured training plan (JSON) for the dashboard.
        """
        # Prepare context
        activities_str = activities_summary.to_string() if hasattr(activities_summary, 'to_string') else str(activities_summary)
        
        # Safe extract
        user_settings = user_settings or {}
        sport = user_settings.get("primary_sport", "Endurance Sports")
        language = user_settings.get("language", "en")
        
        language_map = {
            "en": "English", "tr": "Turkish", "de": "German", 
            "ru": "Russian", "fr": "French", "it": "Italian", "es": "Spanish"
        }
        target_language = language_map.get(language, "English")
        
        name = user_profile.get('fullName', 'Athlete') if user_profile else 'Athlete'
        vo2max = user_profile.get('vo2MaxRunning', 'N/A') if user_profile else 'N/A'
        fitness_age = user_profile.get('fitnessAge', 'N/A') if user_profile else 'N/A'
        
        resting_hr = health_stats.get('restingHeartRate', 'N/A') if health_stats else 'N/A'
        stress = health_stats.get('averageStressLevel', 'N/A') if health_stats else 'N/A'
        body_battery = health_stats.get('bodyBatteryHighestValue', 'N/A') if health_stats else 'N/A'
        
        sleep_quality = 'N/A'
        sleep_score = 'N/A'
        if sleep_data and 'dailySleepDTO' in sleep_data:
            sleep_quality = sleep_data['dailySleepDTO'].get('sleepQualityType', 'N/A')
            sleep_score = sleep_data['dailySleepDTO'].get('sleepScore', 'N/A')
        
        # Build prompt
        prompt = f"""
        Act as an elite {sport} coach.
        Create a **{duration_str}** professional training plan for this athlete.
        
        **Athlete Context:**
        - Name: {name}
        - Sport: {sport}
        - VO2max: {vo2max} ml/kg/min (Fitness age: {fitness_age})
        - Recovery: Resting HR {resting_hr}, Body Battery {body_battery}/100, Stress {stress}/100
        - Sleep: {sleep_score}/100 ({sleep_quality})
        - Recent Load: {activities_str}
        
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
        try:
            # Safely extract key metrics - handle various data structures from Garmin
            # 'get_activity' can return different structures depending on activity type
            summary = activity_data
            if isinstance(activity_data, dict) and 'summaryDTO' in activity_data:
                summary = activity_data['summaryDTO']
            
            # Safely extract basic info with fallbacks
            name = summary.get('activityName', 'Activity') if isinstance(summary, dict) else 'Activity'
            
            # Handle activityType which can be a dict or missing
            type_info = summary.get('activityType', {}) if isinstance(summary, dict) else {}
            type_key = type_info.get('typeKey', 'exercise') if isinstance(type_info, dict) else 'exercise'
            
            # Helper for safe float conversion
            def safe_float(val):
                try: 
                    return float(val) if val is not None else 0.0
                except: 
                    return 0.0

            # Safely extract metrics with defaults
            dist = safe_float(summary.get('distance', 0) if isinstance(summary, dict) else 0)
            dist_km = dist / 1000
            
            duration = safe_float(summary.get('duration', 0) if isinstance(summary, dict) else 0)
            duration_min = duration / 60 if duration > 0 else 0
            
            avg_hr = summary.get('averageHR', 'N/A') if isinstance(summary, dict) else 'N/A'
            max_hr = summary.get('maxHR', 'N/A') if isinstance(summary, dict) else 'N/A'
            
            avg_speed = safe_float(summary.get('averageSpeed', 0) if isinstance(summary, dict) else 0)
            
            # approximate pace calculation (min/km)
            avg_pace_str = "N/A"
            if avg_speed > 0:
                pace_per_km_sec = 1000 / avg_speed
                p_min = int(pace_per_km_sec // 60)
                p_sec = int(pace_per_km_sec % 60)
                avg_pace_str = f"{p_min}:{p_sec:02d} /km"

            # Laps/Splits context - handle missing or unexpected structures
            splits_context = ""
            laps = []
            
            # Try to extract splits from various possible structures
            if isinstance(activity_data, dict):
                splits_data = activity_data.get('splits')
                
                if splits_data:
                    if isinstance(splits_data, dict) and 'lapDTOs' in splits_data:
                        laps = splits_data['lapDTOs']
                    elif isinstance(splits_data, list):
                        laps = splits_data
                 
            # Only process laps if we actually have them
            if laps and isinstance(laps, list) and len(laps) > 0:
                splits_context = "Splits/Laps (First 10):\n"
                for i, lap in enumerate(laps[:10]):
                    if not isinstance(lap, dict):
                        continue
                        
                    l_dur = safe_float(lap.get('duration', 0))
                    l_dist = safe_float(lap.get('distance', 0))
                    l_hr = lap.get('averageHR', 'N/A')
                    l_speed = safe_float(lap.get('averageSpeed', 0))
                    l_pace = "N/A"
                    if l_speed > 0:
                        l_p_sec = 1000 / l_speed
                        l_pace = f"{int(l_p_sec//60)}:{int(l_p_sec%60):02d}"
                    
                    splits_context += f"- Lap {i+1}: {l_dist:.0f}m in {l_dur:.0f}s, Avg HR {l_hr}, Pace {l_pace}\n"
            else:
                splits_context = "No detailed lap/split data available for this activity.\n"

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
            Act as an elite {sport_context} coach analyzing this workout: "{name}" ({type_key}).
            
            **Workout Data:**
            - Distance: {dist_km:.2f} km
            - Duration: {duration_min:.1f} min
            - Avg HR: {avg_hr} bpm (Max: {max_hr})
            - Avg Pace: {avg_pace_str}
            
            {splits_context}
            
            **Task:**
            Provide a professional, structured analysis in {target_language} with these sections:
            
            📊 PERFORMANCE SUMMARY
            One sentence summarizing the workout type and execution quality.
            
            💓 HEART RATE & EFFORT ANALYSIS  
            2-3 sentences analyzing HR zones, effort level, and pacing strategy based on the data.
            
            🎯 COACHING INSIGHTS
            2-3 sentences with specific recommendations for improvement or what to maintain in future sessions.
            
            Use the section headers EXACTLY as shown above (with emojis). Keep each section concise and professional.
            """
            
            logger.info(f"Analyzing activity {name} with Gemini...")
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Failed to analyze activity: {e}")
            return "Could not analyze activity due to an internal error."

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
