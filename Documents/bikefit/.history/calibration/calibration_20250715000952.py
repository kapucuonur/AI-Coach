import json
import os

def save_calibration(name, data, folder="calibrations"):
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{name}.json")
    with open(path, 'w') as f:
        json.dump(data, f)
    print(f"Saved calibration as {path}")

def load_calibration(name, folder="calibrations"):
    path = os.path.join(folder, f"{name}.json")
    if os.path.exists(path):
        with open(path, 'r') as f:
            return json.load(f)
    else:
        print(f"No calibration found at {path}")
        return None
