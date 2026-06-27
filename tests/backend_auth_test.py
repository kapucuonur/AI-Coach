import os
import sys
from dotenv import load_dotenv
sys.path.append(os.getcwd())
load_dotenv()

from backend.services.garmin_client import GarminClient

email = os.getenv("GARMIN_EMAIL")
password = os.getenv("GARMIN_PASSWORD")

print(f"Testing auth with {email}")
client = GarminClient(email, password)
if client.login():
    print(f"Success! Display Name: {client.client.display_name}")
else:
    print("Failed to login")
