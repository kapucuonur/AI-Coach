# model/predict.py
import joblib
import numpy as np
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "fit_model.pkl")

def predict_ideal_angles(height, leg_length, torso_length):
    try:
        model = joblib.load(MODEL_PATH)
    except FileNotFoundError:
        print("Model not found! Train it with ml_model.py")
        return None

    input_data = np.array([[height, leg_length, torso_length]])
    predicted_angles = model.predict(input_data)
    return {
        "hip_angle": round(predicted_angles[0][0], 1),
        "knee_angle": round(predicted_angles[0][1], 1)
    }
