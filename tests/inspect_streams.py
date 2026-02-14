import sys
import os
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.garmin_client import GarminClient
from tests.inspect_garmin_data import load_env_manual

def inspect_streams():
    env = load_env_manual()
    client = GarminClient(env["GARMIN_EMAIL"], env["GARMIN_PASSWORD"])
    if not client.login()[0]:
        print("Login failed")
        return

    activities = client.get_activities(days=7)
    # Find a running or cycling activity (avoid manual ones if possible)
    # Loop through ALL activities to find one with streams
    valid_act = None
    for act in activities:
        aid = act['activityId']
        name = act['activityName']
        print(f"Checking {name} ({aid})...")
        
        try:
            if hasattr(client.client, 'get_activity_details'):
                details = client.client.get_activity_details(aid)
                if details and details.get('metricDescriptors'):
                    print(f"FOUND STREAM DATA in {name}!")
                    print("Descriptors:", json.dumps(details['metricDescriptors'][:3], indent=2))
                    metrics = details.get('activityDetailMetrics')
                    if metrics:
                         print("First Metric Item:", json.dumps(metrics[0], indent=2))
                    valid_act = act
                    break
        except Exception as e:
            print(f"Error checking {name}: {e}")
            
    if not valid_act:
        print("No activity with streams found in recent history.")
                 
    if not valid_act:
        print("No activity with streams found in recent history.")



if __name__ == "__main__":
    inspect_streams()
