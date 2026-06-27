import pytest
from backend.services.data_processor import DataProcessor

def test_process_activities():
    dummy_data = [
        {
            'activityId': 1, 'activityName': 'Run', 'startTimeLocal': '2023-10-01 08:00:00',
            'activityType': {'typeKey': 'running'}, 'distance': 5000, 'duration': 1800,
            'averageHeartRate': 140, 'trainingStressScore': 50
        },
        {
            'activityId': 2, 'activityName': 'Cycle', 'startTimeLocal': '2023-10-02 18:00:00',
            'activityType': {'typeKey': 'cycling'}, 'distance': 20000, 'duration': 3600,
            'averageHeartRate': 130, 'trainingStressScore': 60
        }
    ]
    
    processor = DataProcessor()
    df = processor.process_activities(dummy_data)
    assert not df.empty
    assert 'date' in df.columns
    assert 'tss' in df.columns
    assert df['activityType'].iloc[0] == 'running'
