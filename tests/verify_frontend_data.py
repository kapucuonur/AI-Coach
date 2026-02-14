import sys
import os
import json

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.services.garmin_client import GarminClient
from tests.inspect_garmin_data import load_env_manual

def verify_frontend_data():
    print("--- Verifying Data for ActivityAnalysis.jsx ---")
    
    env = load_env_manual()
    email = env.get("GARMIN_EMAIL")
    password = env.get("GARMIN_PASSWORD")
    
    if not email or not password:
        print("FAIL: Check env vars")
        return

    client = GarminClient(email, password)
    if not client.login()[0]:
        print("FAIL: Login error")
        return

    # Get recent activity
    activities = client.get_activities(days=2)
    if not activities:
        print("SKIP: No recent activities to test.")
        return

    act = activities[0]
    aid = act['activityId']
    name = act['activityName']
    print(f"Testing Activity: {name} (ID: {aid})")

    # Call the fixed method
    details = client.get_activity_details(aid)
    
    # 1. Verify Top-Level Stats (MetricDetailModal usage)
    print("\n[Check 1] Top-Level Stats (Distance, Duration, HR)")
    
    dist = details.get('distance')
    dur = details.get('duration')
    avg_hr = details.get('averageHR')
    
    print(f"  - Distance: {dist} (Expected: > 0)")
    print(f"  - Duration: {dur} (Expected: > 0)")
    print(f"  - Avg HR:   {avg_hr}")

    if dist is None or dur is None:
        print("  ❌ FAIL: Missing top-level metrics!")
    else:
        print("  ✅ PASS: Top-level metrics present.")

    # 2. Verify Splits (Chart Data usage)
    print("\n[Check 2] Splits Data (For Charts)")
    splits = details.get('splits')
    
    if not splits:
        print("  ❌ FAIL: 'splits' array is missing or empty!")
    else:
        print(f"  ✅ PASS: 'splits' array found with {len(splits)} segments.")
        print(f"     Sample Split[0]: {json.dumps(splits[0], indent=2)}")
        
        # Check inside split
        s0 = splits[0]
        if 'distance' in s0 and 'averageSpeed' in s0:
             print("  ✅ PASS: Split contains necessary chart data fields.")
        else:
             print("  ❌ FAIL: Split missing key fields.")

if __name__ == "__main__":
    verify_frontend_data()
