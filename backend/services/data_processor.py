import math
import logging
from datetime import date, datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DataProcessor:
    def __init__(self):
        pass

    def process_activities(self, activities_data):
        """Convert activities JSON to list of dicts with basic metrics, pure python."""
        if not activities_data:
            logger.warning("No activities data to process.")
            return []

        columns_to_keep = {
            'activityId', 'activityName', 'startTimeLocal', 'activityType',
            'distance', 'duration', 'averageSpeed', 'averageHeartRate', 
            'maxHeartRate', 'calories', 'averagePower', 'trainingStressScore'
        }
        
        processed = []
        for row in activities_data:
            new_row = {}
            for col in columns_to_keep:
                if col in row:
                    new_row[col] = row[col]
            
            # Flatten activityType dictionaries into raw strings
            if 'activityType' in new_row:
                at = new_row['activityType']
                new_row['activityType'] = at.get('typeKey', 'unknown') if isinstance(at, dict) else str(at)
            
            # Rename for clarity
            if 'startTimeLocal' in new_row:
                new_row['date'] = new_row.pop('startTimeLocal')
            if 'trainingStressScore' in new_row:
                new_row['tss'] = new_row.pop('trainingStressScore')
            
            processed.append(new_row)
            
        return processed

    def calculate_weekly_summary(self, processed_activities):
        """Calculate weekly distance, duration, and load. Returns dict formatted like pandas to_dict()."""
        from collections import defaultdict
        
        if not processed_activities:
            return {}
            
        distance_dict = defaultdict(float)
        duration_dict = defaultdict(float)
        tss_dict = defaultdict(float)
        count_dict = defaultdict(int)
        
        for row in processed_activities:
            d_str = row.get('date')
            if not d_str:
                continue
                
            try:
                # Parse datetime. Expected: '2026-04-03 14:02:40'
                if len(d_str) >= 19 and 'T' not in d_str:
                    pt = datetime.strptime(d_str[:19], "%Y-%m-%d %H:%M:%S")
                elif 'T' in d_str:
                    # Clean the ISO string correctly before parsing
                    cleaned = d_str[:19].replace('Z', '')
                    pt = datetime.fromisoformat(cleaned)
                else:
                    pt = datetime.strptime(d_str[:10], "%Y-%m-%d")
                    
                # Get the Monday of that week
                monday = pt.date() - timedelta(days=pt.date().weekday())
                # Format to match pandas Period week representation "2024-03-25/2024-03-31" to ensure compatibility
                week_end = monday + timedelta(days=6)
                week_key = f"{monday.isoformat()}/{week_end.isoformat()}"
            except Exception as e:
                logger.debug(f"Row skipped in weekly_summary due to date parsing: {d_str} error: {e}")
                continue

            dist = row.get('distance')
            dur = row.get('duration')
            tss = row.get('tss')

            if dist: distance_dict[week_key] += float(dist)
            if dur: duration_dict[week_key] += float(dur)
            if tss: tss_dict[week_key] += float(tss)
            count_dict[week_key] += 1

        # Sort weeks descending
        sorted_weeks = sorted(list(count_dict.keys()), reverse=True)
        
        # Build the final dict of dicts (matches pandas DataFrame.to_dict() structure)
        res = {
            "distance": {w: distance_dict[w] for w in sorted_weeks},
            "duration": {w: duration_dict[w] for w in sorted_weeks},
            "tss": {w: tss_dict[w] for w in sorted_weeks},
            "count": {w: count_dict[w] for w in sorted_weeks}
        }
        
        # Return empty DataFrame-compatible format if no weeks
        if not sorted_weeks:
            return {}
            
        return res
