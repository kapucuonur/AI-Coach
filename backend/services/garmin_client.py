import os
import logging
import threading
import time
from datetime import date, timedelta
from garminconnect import Garmin
from dotenv import load_dotenv

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
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.client = None

    def login(self, mfa_code=None):
        """Authenticate with Garmin Connect using a threaded approach for MFA, with Caching."""
        if not self.email or not self.password:
            msg = "Garmin credentials not provided."
            logger.error(msg)
            return False, msg

        # 0. Check In-Memory Cache (Fastest & Most Stable)
        if not mfa_code and self.email in GLOBAL_CLIENTS:
            try:
                cached_client = GLOBAL_CLIENTS[self.email]
                # Light verification to ensure session is still alive
                # We use a very cheap call if possible, or just assume it works until 401
                # get_full_name() or similar is good.
                # Inspect internal state or try a call?
                # Let's try to access display_name which should be cached in the object
                if cached_client.display_name:
                    logger.info(f"✅ Using cached session for {cached_client.display_name}")
                    self.client = cached_client
                    return True, "Session resumed from memory"
            except Exception as e:
                logger.warning(f"⚠️ Cached session invalid, clearing: {e}")
                del GLOBAL_CLIENTS[self.email]

        home_dir = os.path.expanduser("~")
        garth_dir = os.path.join(home_dir, ".garth")

        # 1. Check if we have a valid saved session on Disk (Fast Path but less reliable on Render)
        if not mfa_code and os.path.exists(garth_dir):
            try:
                self.client = Garmin(self.email, self.password)
                self.client.garth.load(garth_dir)
                # Verify session
                try:
                    self.client.display_name = None
                    try:
                         # Quick API check
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
                         logger.info(f"Session successfully resumed from disk for {self.client.display_name}")
                         # Update Memory Cache
                         GLOBAL_CLIENTS[self.email] = self.client
                         return True, "Session resumed"
                except Exception as e:
                    logger.warning(f"Saved session invalid: {e}")
                    import shutil
                    shutil.rmtree(garth_dir)
            except Exception as e:
                logger.warning(f"Failed to load saved session: {e}")

        # 2. Handle Active/Pending Login
        session = PENDING_SESSIONS.get(self.email)

        if mfa_code:
            # We are verifying - we MUST have a waiting session
            if not session or session.status != "MFA_WAITING":
                logger.warning("Received MFA code but no session is waiting for it.")
                return False, "Session expired or invalid. Please try logging in again."
            
            logger.info("Passing MFA code to background thread...")
            session.set_code(mfa_code)
            
            # Wait for final result
            session.result_event.wait(timeout=30)
            
            if session.status == "SUCCESS":
                self.client = session.client
                # Save persistent session
                try:
                    self.client.garth.dump(garth_dir)
                except Exception as e:
                    logger.warning(f"Failed to save session to disk: {e}")
                
                # Cleanup
                del PENDING_SESSIONS[self.email]
                return True, "Authenticated successfully"
            else:
                error = session.error or "Login failed during verification"
                del PENDING_SESSIONS[self.email]
                return False, error

        else:
            # New Login Request
            if session:
                # Cleanup old session if exists
                try:
                    del PENDING_SESSIONS[self.email]
                except:
                    pass
            
            # Create new session
            session = LoginSession()
            PENDING_SESSIONS[self.email] = session
            session.status = "RUNNING"
            
            def login_thread():
                try:
                    def mfa_callback():
                        logger.info("Background thread hit MFA requirement. Waiting for code...")
                        session.status = "MFA_WAITING"
                        # Signal main thread that we are waiting (implicitly via polling or just the status)
                        
                        # Wait for code
                        start_wait = time.time()
                        # Wait up to 2 minutes for user
                        if not session.code_event.wait(timeout=120):
                             raise ValueError("MFA code timeout")
                        
                        logger.info("Background thread received code. Resuming...")
                        return session.mfa_code

                    # Init client
                    client = Garmin(self.email, self.password, prompt_mfa=mfa_callback)
                    client.login()
                    
                    try:
                        # Extra verify to ensure we are really really logged in
                        client.get_user_profile()
                    except:
                        pass

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
            
            # Poll for status change: either SUCCESS, FAILED, or MFA_WAITING
            # We wait up to 20 seconds for the initial login attempt (to reach MFA or Success)
            start_poll = time.time()
            while time.time() - start_poll < 20:
                if session.status == "MFA_WAITING":
                    return False, "MFA_REQUIRED"
                if session.status == "SUCCESS":
                    self.client = session.client
                    # Save persistence
                    try:
                        self.client.garth.save(garth_dir)
                    except:
                        pass
                    # Update Memory Cache
                    GLOBAL_CLIENTS[self.email] = self.client
                    
                    del PENDING_SESSIONS[self.email]
                    return True, "Authenticated successfully"
                if session.status == "FAILED":
                    err = session.error
                    del PENDING_SESSIONS[self.email]
                    if "MFA_REQUIRED" in str(err): # Fallback if exception passed through
                        return False, "MFA_REQUIRED" 
                    return False, f"Login failed: {err}"
                time.sleep(0.5)
            
            # If we timeout here, it's taking too long
            return False, "Login timed out connecting to Garmin."

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

    def create_workout(self, workout_json):
        """
        Create a structured workout in Garmin Connect.
        workout_json must follow Garmin's workout format.
        """
        if not self.client:
            logger.error("Client not authenticated.")
            return False
        
        try:
            # We assume workout_json is already in the correct format for the library
            # or we construct it here. For now, let's try to pass it directly 
            # or map it if the library needs specific arguments.
            # The garminconnect library has a create_workout method.
            
            # Simple wrapper for now
            logger.info("Creating workout in Garmin Connect...")
            # Note: garminconnect library might strictly require a specific object structure.
            # If AI generates the correct JSON structure for the API, we can send it.
            status = self.client.create_workout(workout_json)
            logger.info(f"Workout created: {status}")
            return True
        except Exception as e:
            logger.error(f"Failed to create workout: {e}")
            return False

if __name__ == "__main__":
    # Test the client
    client = GarminClient()
    # Basic test logic (threaded approach makes local testing slightly different but this is minimal)
