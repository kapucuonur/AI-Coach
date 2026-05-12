from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import mediapipe as mp
from utils.angles import calculate_angle
from model.predict import predict_ideal_angles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kullanıcı ölçüleri
USER_HEIGHT = 178
USER_LEG_LENGTH = 88
USER_TORSO_LENGTH = 64

# Hedef açıları tahmin et
predicted = predict_ideal_angles(USER_HEIGHT, USER_LEG_LENGTH, USER_TORSO_LENGTH)
if predicted is None:
    raise Exception("Model not found! Train it with ml_model.py")

hip_target = predicted['hip_angle']
knee_target = predicted['knee_angle']
elbow_target = 90
torso_target = 45
ankle_target = 90

def angle_advice(angle, target):
    diff = angle - target
    if abs(diff) < 3:
        return "İdeal pozisyon"
    elif diff > 3:
        return "Biraz kapat"
    else:
        return "Biraz aç"

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True)

class ImageData(BaseModel):
    image_base64: str

@app.post("/analyze/")
async def analyze_pose(data: ImageData):
    img_data = data.image_base64.split(",")[1]
    img_bytes = base64.b64decode(img_data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = pose.process(img_rgb)

    if not results.pose_landmarks:
        return {"error": "Poz tespit edilemedi"}

    lm = results.pose_landmarks.landmark
    def pt(name): return [lm[name.value].x, lm[name.value].y]

    hip = pt(mp_pose.PoseLandmark.LEFT_HIP)
    knee = pt(mp_pose.PoseLandmark.LEFT_KNEE)
    ankle = pt(mp_pose.PoseLandmark.LEFT_ANKLE)
    shoulder = pt(mp_pose.PoseLandmark.LEFT_SHOULDER)
    elbow = pt(mp_pose.PoseLandmark.LEFT_ELBOW)
    wrist = pt(mp_pose.PoseLandmark.LEFT_WRIST)
    foot = pt(mp_pose.PoseLandmark.LEFT_FOOT_INDEX)

    angle_knee = calculate_angle(hip, knee, ankle)
    angle_hip = calculate_angle(shoulder, hip, knee)
    angle_elbow = calculate_angle(shoulder, elbow, wrist)
    angle_torso = calculate_angle(elbow, shoulder, hip)
    angle_ankle = calculate_angle(knee, ankle, foot)

    return {
        "knee_angle": angle_knee,
        "knee_feedback": angle_advice(angle_knee, knee_target),
        "hip_angle": angle_hip,
        "hip_feedback": angle_advice(angle_hip, hip_target),
        "elbow_angle": angle_elbow,
        "elbow_feedback": angle_advice(angle_elbow, elbow_target),
        "torso_angle": angle_torso,
        "torso_feedback": angle_advice(angle_torso, torso_target),
        "ankle_angle": angle_ankle,
        "ankle_feedback": angle_advice(angle_ankle, ankle_target)
    }
