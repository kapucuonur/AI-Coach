import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        pass

    def process_activities(self, activities_data):
        """Convert activities JSON to DataFrame and calculate basic metrics."""
        if not activities_data:
            logger.warning("No activities data to process.")
            return pd.DataFrame()

        df = pd.DataFrame(activities_data)
        
        # Select relevant columns if they exist
        columns_to_keep = [
            'activityId', 'activityName', 'startTimeLocal', 'activityType',
            'distance', 'duration', 'averageSpeed', 'averageHeartRate', 
            'maxHeartRate', 'calories', 'averagePower', 'trainingStressScore'
        ]
        
        # Filter only existing columns
        metrics = [col for col in columns_to_keep if col in df.columns]
        df = df[metrics].copy()
        
        # Convert types
        if 'startTimeLocal' in df.columns:
            df['startTimeLocal'] = pd.to_datetime(df['startTimeLocal'])
            
        # Rename for clarity
        df.rename(columns={
            'startTimeLocal': 'date',
            'trainingStressScore': 'tss'
        }, inplace=True)
        
        return df

    def calculate_weekly_summary(self, df):
        """Calculate weekly distance, duration, and load."""
        if df.empty or 'date' not in df.columns:
            return pd.DataFrame()
            
        # Drop activities without a valid date
        valid_df = df.dropna(subset=['date']).copy()
        if valid_df.empty:
            return pd.DataFrame()
            
        valid_df['week'] = valid_df['date'].dt.to_period('W').apply(lambda r: r.start_time if pd.notna(r) else pd.NaT)
        
        # Ensure columns exist before aggregation to prevent KeyErrors
        for col in ['distance', 'duration', 'tss']:
            if col not in valid_df.columns:
                valid_df[col] = 0.0
                
        return valid_df.groupby('week').agg({
            'distance': 'sum',
            'duration': 'sum',
            'tss': 'sum',
            'activityId': 'count'
        }).rename(columns={'activityId': 'count'}).sort_index(ascending=False)

if __name__ == "__main__":
    # Example usage with dummy data
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
    print("Processed Data:")
    print(df.head())
    
    print("\nWeekly Summary:")
    print(processor.calculate_weekly_summary(df))
