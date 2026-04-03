import os
import logging
import threading
import time
import json
import tempfile
import shutil
import traceback
from datetime import date, timedelta
from garminconnect import Garmin
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from backend.models import UserSetting

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Global in-memory store for authenticated clients (Singleton Pattern)
# Key: email, Value: Garmin client instance
GLOBAL_CLIENTS = {}
GLOBAL_CLIENTS_LOCK = threading.RLock()

# Session verification cache - Prevents excessive API calls
# Key: email, Value: timestamp of last verification
SESSION_LAST_VERIFIED = {}
SESSION_VERIFY_INTERVAL = 300  # 5 minutes = 300 seconds

# Cooldown cache for failed SSO logins to prevent IP bans
FAILED_LOGIN_COOLDOWN = {}

# Garmin API Endpoints Constants
class GarminAPIEndpoints:
    # Attempt 1: workout-service with JSON body {workoutId, calendarDate}
    SCHEDULE_WORKOUT_V2 = "/workout-service/schedule"
    # Attempt 2: workout-service REST-style path (community implementations)
    SCHEDULE_WORKOUT_V3 = "/workout-service/workout/{workout_id}/schedule/{date_str}"
    # Attempt 3: legacy calendar-service (original, now mostly 404)
    SCHEDULE_WORKOUT = "/calendar-service/workout/{workout_id}/schedule/{date_str}"
    DEVICE_WORKOUTS = "/device-service/devices/{device_id}/workouts"
    SOCIAL_PROFILE = "/userprofile-service/socialProfile"

# Locks to prevent concurrent logins for the same email
CLIENT_LOCKS = {}

def get_client_lock(email: str) -> threading.Lock:
    if email not in CLIENT_LOCKS:
        CLIENT_LOCKS[email] = threading.Lock()
    return CLIENT_LOCKS[email]

# Global in-memory store for pending login sessions
# Key: email, Value: LoginSession instance
PENDING_SESSIONS = {}

class LoginSession:
    def __init__(self):
        self.status = "INIT"  # INIT, RUNNING, MFA_WAITING, SUCCESS, FAILED
        self.error = None
        self.code_event = threading.Event()
        self.result_event = threading.Event()
        self.mfa_code = None
        self.client = None
        self.thread = None

    def set_code(self, code):
        self.mfa_code = code
        self.code_event.set()

class GarminClient:
    def __init__(self, email, password=None):
        self.email = email
        self.password = password
        self.client = None

    def _get_db_session_key(self):
        return f"garmin_session_{self.email}"

    def load_session_from_db(self, db: Session):
        """Load session tokens from the database."""
        try:
            key = self._get_db_session_key()
            setting = db.query(UserSetting).filter(UserSetting.key == key).first()
            if setting and setting.value:
                logger.info(f"Found persistent session in DB for {self.email}")
                return setting.value
        except Exception as e:
            logger.error(f"Failed to load session from DB: {e}")
        return None

    def save_session_to_db(self, db: Session):
        """Save the current session tokens to the database."""
        if not self.client or not self.client.garth:
            return
        
        try:
            # Use a temporary directory to dump garth tokens
            with tempfile.TemporaryDirectory() as tmpdirname:
                self.client.garth.dump(tmpdirname)
                # Read all files and store them in a dict
                saved_state = {}
                for filename in os.listdir(tmpdirname):
                    file_path = os.path.join(tmpdirname, filename)
                    if os.path.isfile(file_path):
                        with open(file_path, 'r') as f:
                            saved_state[filename] = f.read()
                
                # Save 'saved_state' to DB
                key = self._get_db_session_key()
                setting = db.query(UserSetting).filter(UserSetting.key == key).first()
                if not setting:
                    setting = UserSetting(key=key, value=saved_state)
                    db.add(setting)
                else:
                    setting.value = saved_state
                db.commit()
                
                # Mark as freshly verified when saving
                SESSION_LAST_VERIFIED[self.email] = time.time()
                
                logger.info(f"Saved session to DB for {self.email}")
                
        except Exception as e:
            logger.error(f"Failed to save session to DB: {e}")

    def restore_session_from_data(self, session_data):
        """Restore garth session from data dict with smart verification."""
        try:
            pwd = self.password if self.password else "session_restore_placeholder"
            self.client = Garmin(self.email, pwd)
            
            # Load session from temp dir
            with tempfile.TemporaryDirectory() as tmpdirname:
                for filename, content in session_data.items():
                    with open(os.path.join(tmpdirname, filename), 'w') as f:
                        f.write(content)
                self.client.garth.load(tmpdirname)
            
            # Smart verification - only check if needed
            now = time.time()
            last_verified = SESSION_LAST_VERIFIED.get(self.email, 0)
            time_since_verify = now - last_verified
            
            if time_since_verify > SESSION_VERIFY_INTERVAL:
                logger.info(f"⏰ Last verified {int(time_since_verify)}s ago - verifying session...")
                try:
                    self.client.display_name = None
                    social_profile = self.client.connectapi(
                        "/userprofile-service/socialProfile"
                    )
                    
                    if social_profile and 'displayName' in social_profile:
                        self.client.display_name = social_profile['displayName']
                        SESSION_LAST_VERIFIED[self.email] = now
                        logger.info(f"✅ Session verified for {self.client.display_name}")
                    else:
                        # Try fallback
                        profile = self.client.get_user_profile()
                        if 'displayName' in profile:
                            self.client.display_name = profile['displayName']
                            SESSION_LAST_VERIFIED[self.email] = now
                            logger.info(f"✅ Session verified via profile for {self.client.display_name}")
                    
                except Exception as verify_error:
                    error_msg = str(verify_error)
                    logger.warning(f"⚠️ Session verification failed: {error_msg}")
                    if ("429" in error_msg or "Too Many Requests" in error_msg) and "oauth/exchange" not in error_msg:
                        logger.info("Rate limit hit during verification (data api). Assuming session is valid to avoid SSO spam.")
                        self.client.display_name = self.email
                        SESSION_LAST_VERIFIED[self.email] = now
                    else:
                        self.client = None
                        return False
            else:
                # Skip verification - use cached validation
                remaining = int(SESSION_VERIFY_INTERVAL - time_since_verify)
                logger.info(f"⚡ FAST RESTORE - Skipping verify ({remaining}s until next check)")
                self.client.display_name = self.email  # Placeholder until next verify
            
            if self.client.display_name:
                with GLOBAL_CLIENTS_LOCK:
                    GLOBAL_CLIENTS[self.email] = self.client
                logger.info(f"✅ Session restored for {self.client.display_name}")
                return True
                
        except Exception as e:
            logger.warning(f"Failed to restore session from data: {e}")
            self.client = None
        
        return False

    def login(self, db: Session = None, mfa_code=None):
        """
        Authenticate with Garmin Connect using a threaded approach for MFA, with Caching and DB Persistence.
        Returns: (success: bool, status: str, message: str)
        status can be: "SUCCESS", "MFA_REQUIRED", "FAILED"
        """
        # Password is required for new logins, but not for loading existing sessions from DB
        if not self.email:
            msg = "Email not provided."
            logger.error(msg)
            return False, "FAILED", msg
        
        # Check if password is required (not needed if loading from DB/cache)
        if not self.password and not db and self.email not in GLOBAL_CLIENTS:
            msg = "Garmin credentials not provided."
            logger.error(msg)
            return False, "FAILED", msg

        # Check SSO Cooldown to avoid extending IP bans
        cooldown_expiry = FAILED_LOGIN_COOLDOWN.get(self.email, 0)
        if time.time() < cooldown_expiry:
            remaining = int(cooldown_expiry - time.time())
            msg = f"Garmin servers are currently blocking login attempts due to rate limits. Please try again in {remaining // 60}m {remaining % 60}s."
            logger.warning(msg)
            return False, "FAILED", msg

        # 0. Check In-Memory Cache (Fastest) - Thread Safe
        if not mfa_code:
            with GLOBAL_CLIENTS_LOCK:
                if self.email in GLOBAL_CLIENTS:
                    try:
                        cached_client = GLOBAL_CLIENTS[self.email]
                        if cached_client.display_name:
                            logger.info(f"✅ Using cached session for {cached_client.display_name}")
                            self.client = cached_client
                            return True, "SUCCESS", "Session resumed from memory"
                    except Exception as e:
                        logger.warning(f"⚠️ Cached session invalid, clearing: {e}")
                        del GLOBAL_CLIENTS[self.email]

        # 1. Check DB Persistence (If DB session provided)
        if not mfa_code and db:
            # Prevent multiple simultaneous requests from trying to load from DB and triggering new logins
            lock = get_client_lock(self.email)
            with lock:
                # Double check memory cache in case another thread just loaded it while we waited
                with GLOBAL_CLIENTS_LOCK:
                    if self.email in GLOBAL_CLIENTS:
                        try:
                            cached_client = GLOBAL_CLIENTS[self.email]
                            if cached_client.display_name:
                                logger.info(f"✅ Using cached session for {cached_client.display_name} (from lock)")
                                self.client = cached_client
                                return True, "SUCCESS", "Session resumed from memory (lock)"
                        except Exception:
                            pass
                
                logger.info(f"Checking DB for session {self.email}...")
                session_data = self.load_session_from_db(db)
                if session_data:
                    if self.restore_session_from_data(session_data):
                        # Opportunistically save updated tokens (e.g. if refreshed during verification)
                        if db:
                            self.save_session_to_db(db)
                        return True, "SUCCESS", "Session resumed from database"

        # 2. Filesystem Fallback (Legacy/Local dev) - Keep attempting just in case
        home_dir = os.path.expanduser("~")
        safe_email = self.email.replace('@', '_').replace('.', '_') if self.email else "unknown"
        garth_dir = os.path.join(home_dir, f".garth_{safe_email}")
        if not mfa_code and os.path.exists(garth_dir):
             try:
                pwd = self.password if self.password else "session_restore_placeholder"
                self.client = Garmin(self.email, pwd)
                self.client.garth.load(garth_dir)
                # ... (verification logic same as above) ...
                try:
                    self.client.display_name = None
                    try:
                        social_profile = self.client.connectapi("/userprofile-service/socialProfile")
                        if social_profile: self.client.display_name = social_profile.get('displayName')
                    except Exception as e:
                        error_msg = str(e)
                        if ("429" in error_msg or "Too Many Requests" in error_msg) and "oauth/exchange" not in error_msg:
                            logger.info("Rate limit hit during FS verification. Assuming valid.")
                            self.client.display_name = self.email
                    
                    if not self.client.display_name:
                         try:
                             profile = self.client.get_user_profile()
                             if 'displayName' in profile: self.client.display_name = profile['displayName']
                         except Exception as e:
                             error_msg = str(e)
                             if ("429" in error_msg or "Too Many Requests" in error_msg) and "oauth/exchange" not in error_msg:
                                 logger.info("Rate limit hit during FS verification fallback. Assuming valid.")
                                 self.client.display_name = self.email

                    if self.client.display_name:
                         logger.info(f"Session resumed from disk")
                         with GLOBAL_CLIENTS_LOCK:
                             GLOBAL_CLIENTS[self.email] = self.client
                         # Opportunistically save to DB if we have it
                         if db: self.save_session_to_db(db)
                         return True, "SUCCESS", "Session resumed from disk"
                except:
                     pass # Fall through to real login
             except:
                pass


        # 3. Handle Active/Pending Login (For MFA flow)
        session = PENDING_SESSIONS.get(self.email)

        if mfa_code:
            # We are verifying - we MUST have a waiting session
            if not session or session.status != "MFA_WAITING":
                logger.warning("Received MFA code but no session is waiting for it.")
                return False, "FAILED", "Session expired or invalid. Please try logging in again."
            
            logger.info("Passing MFA code to background thread...")
            session.set_code(mfa_code)
            
            # Wait for final result
            session.result_event.wait(timeout=30)
            
            if session.status == "SUCCESS":
                self.client = session.client
                # Save persistent session
                if db:
                    self.save_session_to_db(db)
                else:
                    try:
                        self.client.garth.dump(garth_dir)
                    except: pass
                
                with GLOBAL_CLIENTS_LOCK:
                    GLOBAL_CLIENTS[self.email] = self.client
                # Cleanup
                del PENDING_SESSIONS[self.email]
                return True, "SUCCESS", "Authenticated successfully"
            else:
                error = session.error or "Login failed during verification"
                del PENDING_SESSIONS[self.email]
                return False, "FAILED", error

        else:
            # We need to lock around session creation to prevent multiple concurrent logins
            with get_client_lock(self.email):
                # Double check inside the lock
                session = PENDING_SESSIONS.get(self.email)
                
                # If a session is already working or waiting for MFA, attach to it instead of killing it
                if session and session.status in ("RUNNING", "MFA_WAITING"):
                    logger.info("Login already in progress (another thread started it). Attaching...")
                    new_session_created = False
                else:
                    logger.info("Starting new Garmin login session in thread...")
                    if session:
                        try: del PENDING_SESSIONS[self.email]
                        except: pass
                    
                    session = LoginSession()
                    PENDING_SESSIONS[self.email] = session
                    session.status = "RUNNING"
                    new_session_created = True

            if new_session_created:
                def login_thread():
                    try:
                        def mfa_callback():
                            logger.info("Background thread hit MFA requirement. Waiting for code...")
                            session.status = "MFA_WAITING"
                            # Wait for code
                            if not session.code_event.wait(timeout=120):
                                 raise ValueError("MFA code timeout")
                            logger.info("Background thread received code. Resuming...")
                            return session.mfa_code

                        # Init client
                        client = Garmin(self.email, self.password, prompt_mfa=mfa_callback)
                        if not client.login():
                            raise Exception("Garmin login failed (invalid credentials or captcha)")
                        
                        try:
                            client.get_user_profile()
                        except: pass

                        session.client = client
                        session.status = "SUCCESS"
                    except Exception as e:
                        error_msg = str(e)
                        logger.error(f"Background login failed: {error_msg}")
                        session.error = error_msg
                        session.status = "FAILED"
                        
                        if "429" in error_msg or "Too Many Requests" in error_msg:
                            # Add 15-minute cooldown for SSO rate limits to let the IP recover
                            FAILED_LOGIN_COOLDOWN[self.email] = time.time() + 900
                            logger.warning(f"Applied 15-minute SSO login cooldown for {self.email} due to Garmin Rate Limit!")
                    finally:
                        session.result_event.set()

                session.thread = threading.Thread(target=login_thread)
                session.thread.daemon = True
                session.thread.start()
            
            # Poll for status change
            start_poll = time.time()
            while time.time() - start_poll < 20:
                if session.status == "MFA_WAITING":
                    return False, "MFA_REQUIRED", "Please enter the authentication code sent to your email."
                if session.status == "SUCCESS":
                    self.client = session.client
                    
                    # Ensure only one thread performs the db commit step and cleanup
                    with get_client_lock(self.email):
                        if self.email in PENDING_SESSIONS and PENDING_SESSIONS[self.email] == session:
                            if db:
                                self.save_session_to_db(db)
                            else:
                                try: self.client.garth.dump(garth_dir)
                                except: pass
                            
                            # Thread-safe cache update
                            with GLOBAL_CLIENTS_LOCK:
                                GLOBAL_CLIENTS[self.email] = self.client
                            
                            # Mark as verified now
                            SESSION_LAST_VERIFIED[self.email] = time.time()
                            
                            del PENDING_SESSIONS[self.email]
                            
                    return True, "SUCCESS", "Authenticated successfully"
                if session.status == "FAILED":
                    err = session.error
                    with get_client_lock(self.email):
                        if self.email in PENDING_SESSIONS and PENDING_SESSIONS[self.email] == session:
                            del PENDING_SESSIONS[self.email]
                    return False, "FAILED", f"Login failed: {err}"
                time.sleep(0.5)
            
            # Timeout occurred
            with get_client_lock(self.email):
                if self.email in PENDING_SESSIONS and PENDING_SESSIONS[self.email] == session:
                    del PENDING_SESSIONS[self.email]
            return False, "FAILED", "Login timed out connecting to Garmin."

    def get_profile(self):
        """Fetch user profile."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        try:
            return self.client.get_user_profile()
        except Exception as e:
            logger.error(f"Error fetching profile: {e}")
            return None

    def get_activities(self, limit=30):
        """Fetch recent activities."""
        if not self.client:
            logger.error("Client not authenticated.")
            return []
        
        # Using 0 as start index to get 'limit' most recent activities regardless of date
        try:
            return self.client.get_activities(0, limit)
        except Exception as e:
            logger.error(f"Error fetching activities: {e}")
            return []

    def get_activity_details(self, activity_id):
        """Fetch detailed activity data (summary and splits)."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        try:
            # Fetch summary
            details = self.client.get_activity(activity_id)
            if not details:
                return None
            
            # Fetch splits (laps)
            try:
                splits = self.client.get_activity_splits(activity_id)
                if splits:
                    details['splits'] = splits
            except Exception as e:
                logger.warning(f"Could not fetch splits for {activity_id}: {e}")

            # Fetch high-resolution stream data (metrics)
            try:
                logger.info(f"Fetching high-resolution metrics for activity {activity_id}...")
                high_res = self.client.get_activity_details(activity_id)
                if high_res:
                    details['high_res'] = high_res
                    logger.info("High-resolution metrics fetched successfully.")
            except Exception as e:
                logger.warning(f"Could not fetch high-res metrics for {activity_id}: {e}")
                
            return details
        except Exception as e:
            logger.error(f"Failed to fetch activity details for {activity_id}: {e}")
            return None

    def get_health_stats(self, date_str=None):
        """Fetch health stats, looking back up to 3 days if today's data is empty."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        target_date = date.fromisoformat(date_str) if date_str else date.today()
        
        # Look back up to 3 days to find populated health stats
        for i in range(4):
            check_date = (target_date - timedelta(days=i)).isoformat()
            try:
                stats = self.client.get_stats_and_body(check_date)
                # Check if it has actual data (like restingHeartRate)
                if stats and stats.get('restingHeartRate'):
                    return stats
            except Exception as e:
                logger.debug(f"Failed to fetch health stats for {check_date}: {e}")
                
        # Fallback to today's (likely empty) stats if nothing found
        try:
            return self.client.get_stats_and_body(target_date.isoformat())
        except Exception as e:
            logger.error(f"Error fetching health stats fallback: {e}")
            return None
    
    def get_sleep_data(self, date_str=None):
        """Fetch sleep data, looking back up to 3 days if today's data is empty."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        target_date = date.fromisoformat(date_str) if date_str else date.today()
        
        for i in range(4):
            check_date = (target_date - timedelta(days=i)).isoformat()
            try:
                sleep = self.client.get_sleep_data(check_date)
                if sleep and sleep.get('dailySleepDTO'):
                    return sleep
            except Exception as e:
                logger.debug(f"Failed to fetch sleep data for {check_date}: {e}")
                
        try:
            return self.client.get_sleep_data(target_date.isoformat())
        except Exception as e:
            logger.error(f"Error fetching sleep data fallback: {e}")
            return None
    
    def get_vo2_max(self):
        """
        Fetch VO2 Max data from Garmin Connect using get_max_metrics().
        Returns a dict with available VO2 Max values, or None.
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        # Define today at the top to avoid NameError in fallback blocks
        today = date.today()
        
        try:
            vo2_data = {}
            
            # VO2 Max doesn't update daily
            try:
                # 1. Try get_training_status() first - it has a "mostRecentVO2Max" field
                try:
                    logger.info("Fetching VO2 Max from get_training_status()...")
                    training_status = self.client.get_training_status(today.isoformat())
                    
                    if training_status and 'mostRecentVO2Max' in training_status:
                        recent_vo2 = training_status['mostRecentVO2Max']
                        # Check generic and cycling buckets
                        for v_type in ['generic', 'cycling']:
                            if v_type in recent_vo2 and recent_vo2[v_type]:
                                v_data = recent_vo2[v_type]
                                if v_data.get('vo2MaxValue'):
                                    vo2_data['vo2MaxValue'] = v_data['vo2MaxValue']
                                    vo2_data['vo2Max'] = v_data['vo2MaxValue']
                                    logger.info(f"✅ Found {v_type} vo2MaxValue in training status: {v_data['vo2MaxValue']}")
                                
                                if v_data.get('vo2MaxPreciseValue'):
                                    vo2_data['vo2MaxPrecise'] = v_data['vo2MaxPreciseValue']
                                    logger.info(f"✅ Found {v_type} vo2MaxPreciseValue in training status: {v_data['vo2MaxPreciseValue']}")
                                    
                                if v_data.get('fitnessAge'):
                                    vo2_data['fitnessAge'] = v_data['fitnessAge']
                                    logger.info(f"✅ Found fitnessAge in training status: {v_data['fitnessAge']}")
                except Exception as ts_error:
                    logger.warning(f"Could not get VO2 Max from training status: {ts_error}")

                # 2. Fallback: check historical intervals if still missing
                if 'vo2Max' not in vo2_data:
                    check_intervals = [0, 1, 3, 7, 14, 30]
                    dates_to_check = [(today - timedelta(days=d)).isoformat() for d in check_intervals]
                    
                    logger.info(f"VO2 Max missing in status, checking historical dates: {dates_to_check}")
                    
                    for date_str in dates_to_check:
                        try:
                            max_metrics = self.client.get_max_metrics(date_str)
                            if max_metrics and isinstance(max_metrics, list) and len(max_metrics) > 0:
                                metrics = max_metrics[0]
                                
                                for v_type in ['generic', 'cycling']:
                                    if v_type in metrics and isinstance(metrics[v_type], dict):
                                        m_data = metrics[v_type]
                                        if m_data.get('vo2MaxValue'):
                                            vo2_data['vo2MaxValue'] = m_data['vo2MaxValue']
                                            vo2_data['vo2Max'] = m_data['vo2MaxValue']
                                            logger.info(f"✅ Found historical {v_type} vo2MaxValue: {m_data['vo2MaxValue']} on {date_str}")
                                        
                                        if m_data.get('vo2MaxPreciseValue'):
                                            vo2_data['vo2MaxPrecise'] = m_data['vo2MaxPreciseValue']
                                            
                                        if m_data.get('fitnessAge') and 'fitnessAge' not in vo2_data:
                                            vo2_data['fitnessAge'] = m_data['fitnessAge']
                                
                                if 'vo2Max' in vo2_data:
                                    break
                        except Exception:
                            continue
                            
            except Exception as e:
                logger.warning(f"Could not get VO2 Max from max_metrics: {e}")
                logger.warning(f"Error details: {traceback.format_exc()}")
            
            # Fitness Age is NOT in max_metrics, try get_stats_and_body()
            if 'fitnessAge' not in vo2_data or not vo2_data.get('fitnessAge'):
                try:
                    logger.info("Attempting to fetch fitness age from get_stats_and_body()...")
                    stats_body = self.client.get_stats_and_body(today.isoformat())
                    logger.info(f"Stats and body response: {stats_body}")
                    
                    if stats_body and isinstance(stats_body, dict):
                        # Check various possible locations
                        if 'fitnessAge' in stats_body and stats_body['fitnessAge']:
                            vo2_data['fitnessAge'] = stats_body['fitnessAge']
                            logger.info(f"✅ Found fitnessAge in stats_body: {stats_body['fitnessAge']}")
                        
                        # Also check nested structures
                        if 'bodyComposition' in stats_body and isinstance(stats_body['bodyComposition'], dict):
                            body_comp = stats_body['bodyComposition']
                            if 'fitnessAge' in body_comp and body_comp['fitnessAge']:
                                vo2_data['fitnessAge'] = body_comp['fitnessAge']
                                logger.info(f"✅ Found fitnessAge in bodyComposition: {body_comp['fitnessAge']}")
                
                except Exception as e:
                    logger.warning(f"Could not get fitness age from stats_and_body: {e}")
            
            # Final fallback: try user profile
            if 'fitnessAge' not in vo2_data or not vo2_data.get('fitnessAge'):
                try:
                    profile = self.client.get_user_profile()
                    if profile and isinstance(profile, dict) and 'fitnessAge' in profile:
                        vo2_data['fitnessAge'] = profile['fitnessAge']
                        logger.info(f"✅ Found fitnessAge in user profile: {profile['fitnessAge']}")
                except Exception as e:
                    logger.warning(f"Could not get fitness age from profile: {e}")
            


            # NEW FALLBACK: try get_fitnessage_data()
            if 'fitnessAge' not in vo2_data or not vo2_data.get('fitnessAge'):
                try:
                    logger.info("Attempting to fetch fitness age from get_fitnessage_data()...")
                    fa_data = self.get_fitness_age(today.isoformat())
                    if fa_data and 'fitnessAge' in fa_data:
                         vo2_data['fitnessAge'] = fa_data['fitnessAge']
                         logger.info(f"✅ Found fitnessAge in get_fitnessage_data: {fa_data['fitnessAge']}")
                except Exception as e:
                    logger.warning(f"Could not get fitness age from get_fitnessage_data: {e}")
            
            # Return the data if we found any, otherwise None
            if vo2_data:
                logger.info(f"✅ VO2 Max data retrieved: {vo2_data}")
                return vo2_data
            else:
                logger.warning("⚠️ No VO2 Max data found in max_metrics for last 30 days")
                logger.warning("This usually means:")
                logger.warning("  - User hasn't done qualifying cardio activities (running/cycling with HR monitor)")
                logger.warning("  - Garmin device doesn't support VO2 Max measurement")
                logger.warning("  - Not enough activity history for Garmin to calculate VO2 Max")
                return None
                
        except Exception as e:
            logger.error(f"Failed to fetch VO2 Max data: {e}")
            logger.error(f"Error traceback: {traceback.format_exc()}")
            return None


    def get_fitness_age(self, date_str=None):
        """Fetch fitness age data."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        try:
            target_date = date_str if date_str else date.today().isoformat()
            return self.client.get_fitnessage_data(target_date)
        except Exception as e:
            logger.error(f"Failed to fetch fitness age data: {e}")
            return None

    def get_devices(self):
        """Fetch available devices."""
        if not self.client:
            logger.error("Client not authenticated.")
            return []
        try:
            return self.client.get_devices()
        except Exception as e:
            logger.error(f"Failed to fetch devices: {e}")
            return []

    def sync_all_devices(self):
        """Trigger an immediate sync for all connected devices to pull latest data.
        Note: The explicit /device-service/devices/{id}/sync endpoint often 404s now,
        so we rely on Garmin's passive sync when fetching data instead of explicit queueing."""
        if not self.client:
            logger.error("Client not authenticated.")
            return False
            
        try:
            logger.info("Auto-sync requested. Note: Explicit device sync queuing is disabled to prevent 404 errors.")
            return True
        except Exception as e:
            logger.error(f"Failed to auto-sync devices: {e}")
            return False

    def get_yearly_stats(self, start_year=None):
        """
        Fetch yearly activity stats (distance) for running, cycling, swimming, etc.
        Default: Last 5 years.
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return {}

        try:
            current_year = date.today().year
            if not start_year:
                start_year = current_year - 5
            
            yearly_stats = {}
            
            for year in range(start_year, current_year + 1):
                start_date = f"{year}-01-01"
                end_date = f"{year}-12-31"
                logger.info(f"Fetching stats for {year} ({start_date} to {end_date})...")
                
                try:
                    # Request multiple metrics if possible. If not, we'll request them individually.
                    # 'distance' for distance, 'elevationGain' for elevation
                    summary_dist = self.client.get_progress_summary_between_dates(
                        start_date, end_date, metric="distance"
                    )
                    
                    summary_elev = self.client.get_progress_summary_between_dates(
                        start_date, end_date, metric="elevationGain"
                    )
                    
                    logger.info(f"Raw dist summary for {year}: {json.dumps(summary_dist, default=str)}")
                    logger.info(f"Raw elev summary for {year}: {json.dumps(summary_elev, default=str)}")
                    
                    stats_for_year = {}
                    
                    # Process distance
                    if summary_dist and isinstance(summary_dist, list) and len(summary_dist) > 0:
                        data_item = summary_dist[0]
                        if 'stats' in data_item:
                            stats_obj = data_item['stats']
                            for sport_key, sport_data in stats_obj.items():
                                if 'distance' in sport_data and 'sum' in sport_data['distance']:
                                    # The API returns meters so cm logic is incorrect, convert meters to kilometers
                                    distance_m = sport_data['distance']['sum']
                                    distance_km = round(distance_m / 1000, 2)
                                    if sport_key not in stats_for_year:
                                        stats_for_year[sport_key] = {}
                                    stats_for_year[sport_key]['distance'] = distance_km
                    
                    # Process elevation
                    if summary_elev and isinstance(summary_elev, list) and len(summary_elev) > 0:
                        data_item = summary_elev[0]
                        if 'stats' in data_item:
                            stats_obj = data_item['stats']
                            for sport_key, sport_data in stats_obj.items():
                                if 'elevationGain' in sport_data and 'sum' in sport_data['elevationGain']:
                                    elevation_cm = sport_data['elevationGain']['sum']
                                    elevation_m = round(elevation_cm / 100, 2)
                                    if sport_key not in stats_for_year:
                                        stats_for_year[sport_key] = {}
                                    stats_for_year[sport_key]['elevationGain'] = elevation_m

                    # Formatting fallback for frontend compat: if distance exists, flatten it
                    # But we want to send structured data if we have both
                    flat_stats_for_year = {}
                    for sport, metrics in stats_for_year.items():
                        if 'distance' in metrics:
                            flat_stats_for_year[sport] = metrics['distance']
                        if 'elevationGain' in metrics:
                            flat_stats_for_year[f"{sport}_elevation"] = metrics['elevationGain']

                    yearly_stats[year] = flat_stats_for_year
                    
                except Exception as ye:
                    logger.error(f"Failed to fetch stats for {year}: {ye}")
                    yearly_stats[year] = {"error": str(ye)}
                    
            return yearly_stats

        except Exception as e:
            logger.error(f"Failed to fetch yearly stats: {e}")
            return {}

    def create_workout(self, workout_json: dict) -> dict:
        """
        Create a structured workout in Garmin Connect.
        workout_json must follow Garmin's workout format.
        Returns the created workout JSON (which includes the new workoutId).
        Retries up to 2 times on connection errors (stale keep-alive sockets).
        """
        if not self.client:
            logger.error("Client not authenticated.")
            raise Exception("Client not authenticated.")
        
        import json, time
        logger.info("Creating workout in Garmin Connect...")
        logger.info(f"PAYLOAD: {json.dumps(workout_json)}")
        
        last_error = None
        for attempt in range(1, 4):  # 3 attempts total
            try:
                created_workout = self.client.upload_workout(workout_json)
                logger.info(f"✅ Workout created successfully: {created_workout.get('workoutId')} (attempt {attempt})")
                return created_workout
            except Exception as e:
                last_error = e
                err_str = str(e)
                # Only retry on connection-level errors (reset, timeout, broken pipe)
                if any(kw in err_str for kw in ("ConnectionReset", "Connection reset", "ConnectionAborted", "Connection aborted", "BrokenPipe", "RemoteDisconnected", "104", "Connection refused")):
                    if attempt < 3:
                        wait = attempt * 1.5
                        logger.warning(f"Connection error on attempt {attempt}, retrying in {wait}s... ({e})")
                        time.sleep(wait)
                        continue
                # Non-connection error or out of retries — raise immediately
                logger.error(f"Failed to create workout (attempt {attempt}): {e}")
                raise e
        
        logger.error(f"Failed to create workout after 3 attempts: {last_error}")
        raise last_error


    def schedule_workout(self, workout_id: int, date_str: str) -> bool:
        """
        Schedule a workout on a specific date (YYYY-MM-DD) on the Garmin calendar.
        Tries 3 known endpoint patterns. Returns True on success, False if all fail (non-fatal).
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return False
        
        # --- Attempt 1: POST /workout-service/schedule with JSON body ---
        try:
            logger.info(f"Scheduling workout {workout_id} for {date_str} (v2 JSON body)...")
            url = GarminAPIEndpoints.SCHEDULE_WORKOUT_V2
            payload = {"workoutId": workout_id, "calendarDate": date_str}
            self.client.garth.post("connectapi", url, json=payload, api=True)
            logger.info(f"✅ Workout {workout_id} scheduled via workout-service for {date_str}")
            return True
        except Exception as e1:
            logger.warning(f"Attempt 1 failed ({e1})")
        
        # --- Attempt 2: POST /workout-service/workout/{id}/schedule/{date} (REST path) ---
        try:
            logger.info(f"Scheduling workout {workout_id} for {date_str} (v3 REST path)...")
            url = GarminAPIEndpoints.SCHEDULE_WORKOUT_V3.format(workout_id=workout_id, date_str=date_str)
            self.client.garth.post("connectapi", url, api=True)
            logger.info(f"✅ Workout {workout_id} scheduled via workout-service REST path")
            return True
        except Exception as e2:
            logger.warning(f"Attempt 2 failed ({e2})")
        
        # --- Attempt 3: legacy calendar-service ---
        try:
            url = GarminAPIEndpoints.SCHEDULE_WORKOUT.format(workout_id=workout_id, date_str=date_str)
            self.client.garth.post("connectapi", url, api=True)
            logger.info(f"✅ Workout {workout_id} scheduled via legacy calendar-service")
            return True
        except Exception as e3:
            logger.warning(f"All schedule attempts failed. Workout saved in Garmin Connect but not on calendar. ({e3})")
            return False

    def send_workout_to_device(self, workout_id: int, device_id: str) -> bool:
        """
        Queue a workout to be sent to a specific Garmin device immediately.
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return False
            
        try:
            logger.info(f"Sending workout {workout_id} to device {device_id}...")
            url = GarminAPIEndpoints.DEVICE_WORKOUTS.format(device_id=device_id)
            # Payload is usually a list of workout IDs or objects
            payload = [{"workoutId": workout_id}]
            
            response = self.client.garth.post("connectapi", url, json=payload, api=True)
            logger.info("Workout queued for device sync successfully.")
            return True
        except Exception as e:
            logger.error(f"Failed to send workout to device: {e}")
            return False

if __name__ == "__main__":
    pass
