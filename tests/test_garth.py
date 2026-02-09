import os
import sys
import logging
import garth
from dotenv import load_dotenv

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

email = os.getenv("GARMIN_EMAIL")
password = os.getenv("GARMIN_PASSWORD")

if not email or not password:
    print("Credentials missing")
    sys.exit(1)

print(f"Testing garth login for {email}...")

try:
    garth.login(email, password)
    print("GARTH_LOGIN_SUCCESS")
    print("Token:", garth.client.oauth1_token)
    garth.save("~/.garth")
    print("Session saved to ~/.garth")
except Exception as e:
    print(f"GARTH_LOGIN_FAILED: {e}")
    # If it fails with MFA needed, it might raise an exception or prompt
