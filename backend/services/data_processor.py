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
        
        # Flatten activityType dictionaries into raw strings
        if 'activityType' in df.columns:
            df['activityType'] = df['activityType'].apply(
                lambda x: x.get('typeKey', 'unknown') if isinstance(x, dict) else str(x)
            )
        
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
                
        # Fix NaN summation bypasses for TSS
        valid_df['tss'] = pd.to_numeric(valid_df['tss'], errors='coerce').fillna(0)
                
        return valid_df.groupby('week').agg({
            'distance': 'sum',
            'duration': 'sum',
            'tss': 'sum',
            'activityId': 'count'
        }).rename(columns={'activityId': 'count'}).sort_index(ascending=False)


