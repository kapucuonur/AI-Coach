import logging
import os
import sys
from garminconnect import Garmin
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

load_dotenv()

email = os.getenv("GARMIN_EMAIL")
password = os.getenv("GARMIN_PASSWORD")

if not email or not password:
    logger.error("Credentials missing.")
    sys.exit(1)

try:
    logger.info(f"Attempting to login with {email}...")
    # Initialize Garmin client
    # is_cn=False for global garmin (not China)
    client = Garmin(email, password, is_cn=False)
    client.login()
    logger.info("Login successful!")
    print("LOGIN_SUCCESS")
    
    # Try to fetch profile to confirm
    profile = client.get_user_profile()
    logger.info(f"Profile fetched: {profile['fullName']}")

except Exception as e:
    logger.error(f"Login failed: {e}")
    # Check if it's waiting for 2FA (though this usually happens inside login() via input())
    # The library might throw an error if input is not possible, or hang.
