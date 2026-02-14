
import sys
import os
from unittest.mock import MagicMock

# Add project root to path
sys.path.append(os.getcwd())

# MOCK garminconnect and matplotlib BEFORE importing backend modules
sys.modules["garminconnect"] = MagicMock()
sys.modules["garminconnect.Garmin"] = MagicMock()

# Mock matplotlib to avoid backend issues
sys.modules["matplotlib"] = MagicMock()
sys.modules["matplotlib.pyplot"] = MagicMock()
sys.modules["matplotlib.dates"] = MagicMock()
sys.modules["matplotlib.patches"] = MagicMock()

# Now try to import
try:
    from backend.services.garmin_charts import GarminChartManager
    print("SUCCESS: GarminChartManager imported.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILURE: Could not import GarminChartManager. Error: {e}")
    sys.exit(1)

print("Attempting to instantiate GarminChartManager...")
try:
    # We need a mock client
    mock_client = MagicMock()
    manager = GarminChartManager(client=mock_client)
    print("SUCCESS: GarminChartManager instantiated.")
    
    # Check if advanced charts loaded
    if manager.advanced_charts:
        print("INFO: AdvancedGarminCharts module was loaded and instantiated.")
    else:
        print("INFO: AdvancedGarminCharts module was NOT loaded.")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILURE: Could not instantiate GarminChartManager. Error: {e}")
    sys.exit(1)

print("Attempting to run create_performance_dashboard...")
try:
    # Need to mock fetch_health_data because it calls client methods
    # We can mock the internal method or just mock the client responses?
    # Let's mock the internal method for simplicity to test the *chart generation* part?
    # No, we want to test the full flow if possible, but client calls will hit MagicMock.
    
    # Mocking client.get_user_summary to return a dict
    mock_client.get_user_summary.return_value = {
        'restingHeartRate': 60,
        'sleepScore': 85,
        'averageStressLevel': 25,
        'bodyBatteryHighestValue': 90,
        'totalSteps': 10000,
        'activeCalories': 500,
        'vo2MaxRunning': 50,
        'recoveryTime': 12,
        'hrvStatus': {'weeklyAvg': 40}
    }
    
    # Run it
    manager.create_performance_dashboard(days=1)
    print("SUCCESS: create_performance_dashboard ran.")

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILURE: create_performance_dashboard crashed. Error: {e}")
