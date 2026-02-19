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
                logger.info(f"Saved session to DB for {self.email}")
                
        except Exception as e:
            logger.error(f"Failed to save session to DB: {e}")

    def restore_session_from_data(self, session_data):
        """Restore garth session from data dict."""
        try:
            # Create a client instance (password not used when loading from session)
            pwd = self.password if self.password else "session_restore_placeholder"
            self.client = Garmin(self.email, pwd)
            
            # Use temp dir to load
            with tempfile.TemporaryDirectory() as tmpdirname:
                for filename, content in session_data.items():
                    with open(os.path.join(tmpdirname, filename), 'w') as f:
                        f.write(content)
                
                self.client.garth.load(tmpdirname)
            
            # Verify validity
            try:
                self.client.display_name = None
                # Lightweight check
                social_profile = self.client.connectapi("/userprofile-service/socialProfile")
                if social_profile and 'displayName' in social_profile:
                     self.client.display_name = social_profile['displayName']
            except:
                pass
                
            if not self.client.display_name:
                profile = self.client.get_user_profile()
                if 'displayName' in profile:
                    self.client.display_name = profile['displayName']
            
            if self.client.display_name:
                logger.info(f"Session successfully resumed from DB data for {self.client.display_name}")
                GLOBAL_CLIENTS[self.email] = self.client
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

        # 0. Check In-Memory Cache (Fastest)
        if not mfa_code and self.email in GLOBAL_CLIENTS:
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
            session_data = self.load_session_from_db(db)
            if session_data:
                if self.restore_session_from_data(session_data):
                    return True, "SUCCESS", "Session resumed from database"

        # 2. Filesystem Fallback (Legacy/Local dev) - Keep attempting just in case
        home_dir = os.path.expanduser("~")
        garth_dir = os.path.join(home_dir, ".garth")
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
                    except: pass
                    
                    if not self.client.display_name:
                         profile = self.client.get_user_profile()
                         if 'displayName' in profile: self.client.display_name = profile['displayName']

                    if self.client.display_name:
                         logger.info(f"Session resumed from disk")
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
                
                GLOBAL_CLIENTS[self.email] = self.client
                # Cleanup
                del PENDING_SESSIONS[self.email]
                return True, "SUCCESS", "Authenticated successfully"
            else:
                error = session.error or "Login failed during verification"
                del PENDING_SESSIONS[self.email]
                return False, "FAILED", error

        else:
            # New Login Request
            if session:
                try: del PENDING_SESSIONS[self.email]
                except: pass
            
            # Create new session
            session = LoginSession()
            PENDING_SESSIONS[self.email] = session
            session.status = "RUNNING"
            
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
                    client = Garmin(self.email, self.password)
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
                    if db:
                        self.save_session_to_db(db)
                    else:
                        try: self.client.garth.dump(garth_dir)
                        except: pass
                    
                    GLOBAL_CLIENTS[self.email] = self.client
                    del PENDING_SESSIONS[self.email]
                    return True, "SUCCESS", "Authenticated successfully"
                if session.status == "FAILED":
                    err = session.error
                    del PENDING_SESSIONS[self.email]
                    return False, "FAILED", f"Login failed: {err}"
                time.sleep(0.5)
            
            return False, "FAILED", "Login timed out connecting to Garmin."

    def get_profile(self):
        """Fetch user profile."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        return self.client.get_user_profile()

    def get_activities(self, days=30):
        """Fetch recent activities."""
        if not self.client:
            logger.error("Client not authenticated.")
            return []
        
        start_date = date.today() - timedelta(days=days)
        # Using 0 as start index to get most recent
        return self.client.get_activities_by_date(start_date.isoformat(), date.today().isoformat())

    def get_activity_details(self, activity_id):
        """Fetch detailed activity data (splits, streams, etc)."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        try:
            # Check if we can get details. 
            # The garminconnect library has `get_activity(activity_id)`
            return self.client.get_activity(activity_id)
        except Exception as e:
            logger.error(f"Failed to fetch activity details for {activity_id}: {e}")
            return None

    def get_health_stats(self, date_str=None):
        """Fetch health stats for a specific date (YYYY-MM-DD). Defaults to today."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        target_date = date_str if date_str else date.today().isoformat()
        return self.client.get_stats_and_body(target_date)
    
    def get_sleep_data(self, date_str=None):
        """Fetch sleep data for a specific date (YYYY-MM-DD). Defaults to today."""
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        target_date = date_str if date_str else date.today().isoformat()
        return self.client.get_sleep_data(target_date)
    
    def get_vo2_max(self):
        """
        Fetch VO2 Max data from Garmin Connect using get_max_metrics().
        Returns a dict with available VO2 Max values, or None.
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return None
        
        try:
            vo2_data = {}
            
            # Try get_max_metrics() for today and recent dates
            # VO2 Max doesn't update daily, so check last 7 days
            try:
                dates_to_check = []
                today = date.today()
                for days_back in range(7):
                    check_date = today - timedelta(days=days_back)
                    dates_to_check.append(check_date.isoformat())
                
                logger.info(f"Checking VO2 Max for dates: {dates_to_check}")
                
                for date_str in dates_to_check:
                    try:
                        max_metrics = self.client.get_max_metrics(date_str)
                        
                        # Log what we actually get
                        logger.info(f"Max metrics for {date_str}: {max_metrics}")
                        
                        # The API returns a LIST, not a dict!
                        if max_metrics and isinstance(max_metrics, list) and len(max_metrics) > 0:
                            # Get the first item from the list
                            metrics = max_metrics[0]
                            
                            # VO2 Max is inside the 'generic' key
                            if 'generic' in metrics and isinstance(metrics['generic'], dict):
                                generic = metrics['generic']
                                
                                # Extract VO2 Max values
                                if 'vo2MaxValue' in generic and generic['vo2MaxValue']:
                                    vo2_data['vo2MaxValue'] = generic['vo2MaxValue']
                                    vo2_data['vo2Max'] = generic['vo2MaxValue']
                                    logger.info(f"✅ Found vo2MaxValue: {generic['vo2MaxValue']} on {date_str}")
                                
                                if 'vo2MaxPreciseValue' in generic and generic['vo2MaxPreciseValue']:
                                    vo2_data['vo2MaxPrecise'] = generic['vo2MaxPreciseValue']
                                    logger.info(f"✅ Found vo2MaxPreciseValue: {generic['vo2MaxPreciseValue']} on {date_str}")
                                
                                # Log the FULL generic object to debug fitness age
                                logger.info(f"📊 Full generic object: {generic}")
                                
                                if 'fitnessAge' in generic and generic['fitnessAge']:
                                    vo2_data['fitnessAge'] = generic['fitnessAge']
                                    logger.info(f"✅ Found fitnessAge: {generic['fitnessAge']} on {date_str}")
                                else:
                                    logger.warning(f"⚠️ fitnessAge is None or missing in generic object on {date_str}")
                                
                                # If we found any VO2 Max data, we're done
                                if 'vo2Max' in vo2_data or 'vo2MaxValue' in vo2_data:
                                    break
                            
                            # Also check for cycling-specific VO2 Max
                            if 'cycling' in metrics and isinstance(metrics['cycling'], dict):
                                cycling = metrics['cycling']
                                if 'vo2MaxValue' in cycling and cycling['vo2MaxValue']:
                                    vo2_data['vo2MaxCycling'] = cycling['vo2MaxValue']
                                    logger.info(f"✅ Found vo2MaxCycling: {cycling['vo2MaxValue']} on {date_str}")
                    
                    except Exception as date_error:
                        logger.debug(f"No max metrics for {date_str}: {date_error}")
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
            
            # Return the data if we found any, otherwise None
            if vo2_data:
                logger.info(f"✅ VO2 Max data retrieved: {vo2_data}")
                return vo2_data
            else:
                logger.warning("⚠️ No VO2 Max data found in max_metrics for last 7 days")
                logger.warning("This usually means:")
                logger.warning("  - User hasn't done qualifying cardio activities (running/cycling with HR monitor)")
                logger.warning("  - Garmin device doesn't support VO2 Max measurement")
                logger.warning("  - Not enough activity history for Garmin to calculate VO2 Max")
                return None
                
        except Exception as e:
            logger.error(f"Failed to fetch VO2 Max data: {e}")
            logger.error(f"Error traceback: {traceback.format_exc()}")
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

    def create_workout(self, workout_json):
        """
        Create a structured workout in Garmin Connect.
        workout_json must follow Garmin's workout format.
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return False
        
        try:
            logger.info("Creating workout in Garmin Connect...")
            status = self.client.create_workout(workout_json)
            logger.info(f"Workout created: {status}")
            return True
        except Exception as e:
            logger.error(f"Failed to create workout: {e}")
            return False

if __name__ == "__main__":
    pass
