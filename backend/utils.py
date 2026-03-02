import math
import numpy as np
from datetime import date, datetime

def sanitize_for_json(obj):
    """Recursively processes the response dict to ensure everything is JSON-compliant."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, (date, datetime)):
        return obj.isoformat()
    return obj
