
import os
import sys
import json
from datetime import date

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.garmin_client import GarminClient

def load_env_manual():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if not os.path.exists(env_path):
        return {}
    
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip()
    return env_vars

def inspect_data():
    env = load_env_manual()
    email = env.get("GARMIN_EMAIL")
    password = env.get("GARMIN_PASSWORD")
    
    if not email or not password:
        print("Error: Garmin credentials not found in env")
        return

    print(f"Logging in as {email}...")
    client = GarminClient(email, password)
    logged_in, status, msg = client.login()
    
    if not logged_in:
        print(f"Login failed: {msg}")
        return

    print("Login successful.")
    today = date.today().isoformat()
    print(f"Inspecting data for: {today}")

    # 1. User Summary
    print("\n--- USER SUMMARY (get_user_summary) ---")
    try:
        stats = client.client.get_user_summary(today)
        print("Summary Keys:", list(stats.keys()))
        vo2_keys = [k for k in stats.keys() if 'vo2' in k.lower()]
        print(f"VO2-related keys in summary: {vo2_keys}")
        for k in vo2_keys:
            print(f"  {k}: {stats[k]}")
        print(f"  sleepScore: {stats.get('sleepScore')}")
    except Exception as e:
        print(f"Summary fetch failed: {e}")

    # 2. Training Status
    print("\n--- TRAINING STATUS (get_training_status) ---")
    try:
        # get_training_status usually returns the latest status
        ts = client.client.get_training_status(today)
        if ts:
             print("Training Status Keys:", list(ts.keys()))
             vo2_keys = [k for k in ts.keys() if 'vo2' in k.lower()]
             print(f"VO2-related keys in Training Status: {vo2_keys}")
             for k in vo2_keys:
                 print(f"  {k}: {ts[k]}")
        else:
            print("No training status returned.")
    except Exception as e:
        print(f"Training status fetch failed: {e}")

    print("\n--- MAX METRICS (get_max_metrics) ---")
    try:
        max_metrics = client.client.get_max_metrics(today)
        print(json.dumps(max_metrics, indent=2))
    except Exception as e:
        print(f"Max metrics fetch failed: {e}")
        
    print("\n--- STATS AND BODY (get_stats_and_body) ---")
    try:
        stats_body = client.client.get_stats_and_body(today)
        # print only keys and vo2
        print("Stats Body Keys:", list(stats_body.keys()))
        vo2 = {k: v for k, v in stats_body.items() if 'vo2' in k.lower()}
        print(f"VO2 in Stats Body: {vo2}")
    except Exception as e:
        print(f"Stats & Body fetch failed: {e}")

    # 3. Sleep Data
    print("\n--- SLEEP DATA (get_sleep_data) ---")
    try:
        sleep = client.client.get_sleep_data(today)
        if sleep:
            print("Sleep Keys:", list(sleep.keys()))
            if 'dailySleepDTO' in sleep:
                dto = sleep['dailySleepDTO']
                print("DTO Keys:", list(dto.keys()))
                print(f"  sleepScore: {dto.get('sleepScore')}")
            else:
                print("No dailySleepDTO found.")
        else:
            print("No sleep data returned.")
    except Exception as e:
        print(f"Sleep fetch failed: {e}")
        
    # 4. Activity Details (Just one)
    print("\n--- RECENT ACTIVITY ---")
    try:
        activities = client.get_activities(days=2)
        if activities:
            act = activities[0]
            print(f"Activity: {act['activityName']} ({act['activityId']})")
            print(f"Top-level keys: {list(act.keys())}")
            
            # Print key metrics from top-level activity list item
            print(f"List Item - Distance: {act.get('distance')}")
            print(f"List Item - Duration: {act.get('duration')}")
            print(f"List Item - AvgHR: {act.get('averageHR')}")
            
            details = client.get_activity_details(act['activityId'])
            if details:
                 print("Details Top-Level Keys (After Flattening):", list(details.keys()))
                 print(f"Details - Distance: {details.get('distance')}")
                 print(f"Details - Duration: {details.get('duration')}")
                 
                 splits = details.get('splits')
                 if splits:
                     print(f"Splits found: {len(splits)}")
                     print(f"Split 0 Distance: {splits[0].get('distance')}")
                 else:
                     print("No splits found.")
                     
        else:
            print("No recent activities found.")
    except Exception as e:
        print(f"Activity fetch failed: {e}")


if __name__ == "__main__":
    # Redirect stdout to file
    with open('inspect_output.txt', 'w') as f:
        sys.stdout = f
        inspect_data()
        sys.stdout = sys.__stdout__
    print("Inspection complete. Output written to inspect_output.txt")
