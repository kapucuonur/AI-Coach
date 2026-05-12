from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import mediapipe as mp
from utils.angles import calculate_angle
from model.predict import predict_ideal_angles
import config
# Kullanıcı ölçüleri (örnek)
USER_HEIGHT = 178
USER_LEG_LENGTH = 88
USER_TORSO_LENGTH = 64

# Modelden ideal açılar al
predicted = predict_ideal_angles(USER_HEIGHT, USER_LEG_LENGTH, USER_TORSO_LENGTH)
if predicted is None:
    raise Exception("Model not found! Train it with ml_model.py")

hip_target = predicted['hip_angle']
knee_target = predicted['knee_angle']
elbow_target = 90
torso_target = 45
ankle_target = 90

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=True)

class ImageData(BaseModel):
    image_base64: str
    bike_type: str = "road"

def get_knee_advice(angle, target):
    diff = angle - target
    if abs(diff) < 4:
        return "ideal"
    elif diff > 0:
        return "lower_saddle"
    else:
        return "raise_saddle"

def get_torso_advice(angle, target):
    diff = angle - target
    if abs(diff) < 5:
        return "ideal"
    elif diff > 0:
        return "lower_handlebars"
    else:
        return "raise_handlebars"

def get_hip_advice(angle, target):
    diff = angle - target
    if abs(diff) < 5:
        return "ideal"
    elif diff > 0:
        return "move_saddle_back"
    else:
        return "move_saddle_forward"

def get_elbow_advice(angle, target):
    diff = angle - target
    if abs(diff) < 5:
        return "ideal"
    elif diff > 0:
        return "bend_elbows"
    else:
        return "straighten_elbows"

def get_ankle_advice(angle, target):
    diff = angle - target
    if abs(diff) < 5:
        return "ideal"
    elif diff > 0:
        return "drop_heel"
    else:
        return "raise_heel"

@app.post("/analyze/")
async def analyze_pose(data: ImageData):
    try:
        # Görseli decode et
        img_data = data.image_base64.split(",")[1]
        img_bytes = base64.b64decode(img_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        results = pose.process(img_rgb)
        if not results.pose_landmarks:
            return {"error": "Poz tespit edilemedi"}

        lm = results.pose_landmarks.landmark

        # Noktalar
        hip     = [lm[mp_pose.PoseLandmark.LEFT_HIP.value].x, lm[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee    = [lm[mp_pose.PoseLandmark.LEFT_KNEE.value].x, lm[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle   = [lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, lm[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        shoulder= [lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, lm[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        elbow   = [lm[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, lm[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
        wrist   = [lm[mp_pose.PoseLandmark.LEFT_WRIST.value].x, lm[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        foot_index = [lm[mp_pose.PoseLandmark.LEFT_FOOT_INDEX.value].x, lm[mp_pose.PoseLandmark.LEFT_FOOT_INDEX.value].y]

        # Açılar
        knee_angle = calculate_angle(hip, knee, ankle)
        hip_angle = calculate_angle(shoulder, hip, knee)
        elbow_angle = calculate_angle(shoulder, elbow, wrist)
        torso_angle = calculate_angle(elbow, shoulder, hip)
        ankle_angle = calculate_angle(knee, ankle, foot_index)

        # Determine targets based on bike type
        if data.bike_type == "triathlon":
            t_torso = 20
            t_elbow = 100
            t_hip = 95
            t_knee = 145
            t_ankle = 90
        else:
            t_torso = torso_target
            t_elbow = elbow_target
            t_hip = hip_target
            t_knee = knee_target
            t_ankle = ankle_target

        return {
            "knee_angle": knee_angle,
            "hip_angle": hip_angle,
            "elbow_angle": elbow_angle,
            "torso_angle": torso_angle,
            "ankle_angle": ankle_angle,
            "knee_feedback": get_knee_advice(knee_angle, t_knee),
            "hip_feedback": get_hip_advice(hip_angle, t_hip),
            "elbow_feedback": get_elbow_advice(elbow_angle, t_elbow),
            "torso_feedback": get_torso_advice(torso_angle, t_torso),
            "ankle_feedback": get_ankle_advice(ankle_angle, t_ankle),
        }
    
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=config.DEBUG)