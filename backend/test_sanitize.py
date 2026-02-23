import pandas as pd
import numpy as np
from datetime import date
def sanitize_for_json(obj):
    if isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient="records")
    if isinstance(obj, (pd.Timestamp, date)):
        return obj.isoformat()
    if isinstance(obj, (np.integer, int)):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        return None if pd.isna(obj) or np.isnan(obj) else float(obj)
    if isinstance(obj, (np.ndarray, list)):
        return [sanitize_for_json(x) for x in obj]
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    if pd.isna(obj): # Handles pd.NA, np.nan, None
        return None
    return obj

test_vals = [pd.NaT, pd.NA, np.nan, float('nan'), date.today(), pd.Timestamp("2023-01-01")]
for t in test_vals:
    print(type(t), sanitize_for_json(t))
