import sys
import os
import base64

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.services.advanced_analytics import AdvancedAnalyticsManager

def save_b64_image(b64_str, filename):
    try:
        img_data = base64.b64decode(b64_str)
        with open(filename, "wb") as f:
            f.write(img_data)
        print(f"✅ Saved {filename}")
    except Exception as e:
        print(f"❌ Failed to save {filename}: {e}")

def main():
    print("Testing Advanced Analytics Generation...")
    
    manager = AdvancedAnalyticsManager()
    
    # 1. Injury Risk
    print("\n1. Generating Injury Risk Dashboard...")
    try:
        b64 = manager.create_injury_risk_dashboard()
        save_b64_image(b64, "verify_injury_risk.png")
    except Exception as e:
        print(f"❌ Injury Risk Failed: {e}")

    # 2. Race Pace
    print("\n2. Generating Race Pace Calculator...")
    try:
        b64 = manager.create_race_pace_calculator()
        save_b64_image(b64, "verify_race_pace.png")
    except Exception as e:
        print(f"❌ Race Pace Failed: {e}")

    # 3. Swim Analysis
    print("\n3. Generating Swim Analysis...")
    try:
        b64 = manager.create_advanced_swim_analysis()
        save_b64_image(b64, "verify_swim_analysis.png")
    except Exception as e:
        print(f"❌ Swim Analysis Failed: {e}")

if __name__ == "__main__":
    main()
