import os
import logging
from datetime import date, timedelta
from garminconnect import Garmin
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class GarminClient:
    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.client = None

    def login(self, mfa_code=None):
        """Authenticate with Garmin Connect."""
        if not self.email or not self.password:
            msg = "Garmin credentials not provided."
            logger.error(msg)
            return False, msg

        home_dir = os.path.expanduser("~")
        garth_dir = os.path.join(home_dir, ".garth")
        garth_mfa_temp = os.path.join(home_dir, ".garth_mfa_temp")

        # Callback for MFA
        def prompt_mfa_callback():
            if mfa_code:
                logger.info("Using provided MFA code.")
                return mfa_code
            
            # If no code provided, save the current state (which has the MFA challenge cookies)
            # so we can resume it in the next request
            try:
                logger.info("MFA requested. Saving intermediate session state.")
                self.client.garth.dump(garth_mfa_temp)
            except Exception as e:
                logger.error(f"Failed to save temp MFA state: {e}")

            # If no code provided, raise specific error to trigger frontend prompt
            raise ValueError("MFA_REQUIRED")

        try:
            # Try to resume session first (only if NOT trying to verify MFA)
            # If we are verifying MFA, we want to skip straight to the fresh login + code
            if not mfa_code and os.path.exists(garth_dir):
                 # Try to resume normal session
                 # Initialize with basic client first
                 self.client = Garmin(self.email, self.password)
                 self.client.garth.load(garth_dir)
                 
                 # Verify...
                 self.client.display_name = None
                 try:
                    social_profile = self.client.connectapi("/userprofile-service/socialProfile")
                    if social_profile and 'displayName' in social_profile:
                        self.client.display_name = social_profile['displayName']
                 except Exception as e:
                    pass # logic from before

                 if not self.client.display_name:
                     profile = self.client.get_user_profile()
                     if 'displayName' in profile:
                         self.client.display_name = profile['displayName']
                 
                 if self.client.display_name:
                     logger.info(f"Session verified. Logged in as: {self.client.display_name}")
                     return True, "Session resumed"
                 
        except Exception as e:
            logger.warning(f"Failed to resume session: {e}. Trying fresh login.")
            import shutil
            if os.path.exists(garth_dir):
                 shutil.rmtree(garth_dir)
                 logger.info("Cleared stale session files.")

        try:
            # Fresh login / MFA Completion
            try:
                self.client = Garmin(self.email, self.password, prompt_mfa=prompt_mfa_callback)
            except TypeError:
                 self.client = Garmin(self.email, self.password)

            # If we are providing a code, we MUST load the temp state from the previous request
            if mfa_code and os.path.exists(garth_mfa_temp):
                logger.info("Loading intermediate MFA state...")
                self.client.garth.load(garth_mfa_temp)

            self.client.login()
            
            # Save session for next time - persistent
            self.client.garth.save(garth_dir)
            
            # Clean up temp file
            if os.path.exists(garth_mfa_temp):
                os.remove(garth_mfa_temp)

            logger.info("Successfully authenticated and saved session.")
            return True, "Authenticated successfully"
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Failed to authenticate: {error_msg}")
            
            # Check for MFA requirement signal
            if "MFA_REQUIRED" in error_msg:
                return False, "MFA_REQUIRED"
                
            # Check for common errors
            if "401" in error_msg or "403" in error_msg:
                return False, "Invalid credentials or Garmin blocked login (Cloudflare)."
            return False, f"Login failed: {error_msg}"


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
    if client.authenticate():
        logger.info("Fetching profile...")
        profile = client.get_profile()
        logger.info(f"Hello, {profile['fullName']}!")
        
        logger.info("Fetching recent activities...")
        activities = client.get_activities(days=7)
        logger.info(f"Found {len(activities)} activities in the last 7 days.")
        
        logger.info("Fetching stats for today...")
        stats = client.get_health_stats()
        if stats:
             logger.info(f"Resting Heart Rate: {stats.get('restingHeartRate')}")
    else:
        logger.warning("Please set GARMIN_EMAIL and GARMIN_PASSWORD in .env file.")
