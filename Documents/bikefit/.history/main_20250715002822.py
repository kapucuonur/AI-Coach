# main.py

import cv2
import mediapipe as mp
from utils.angles import calculate_angle
from utils.score import score_angle
from calibration.calibration import save_calibration, load_calibration
from model.predict import predict_ideal_angles

# Kullanıcının fiziksel ölçüleri (örnek)
USER_HEIGHT = 178
USER_LEG_LENGTH = 88
USER_TORSO_LENGTH = 64

# MediaPipe başlat
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_drawing = mp.solutions.drawing_utils

# Hedef açıları tahmin et

predicted = predict_ideal_angles(USER_HEIGHT, USER_LEG_LENGTH, USER_TORSO_LENGTH)
hip_target = predicted['hip_angle']
knee_target = predicted['knee_angle']

# Kamera başlat
cap = cv2.VideoCapture(0)

# Kalibrasyon modu
calibration_mode = False

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark

        # Nokta koordinatları (LEFT)
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]

        # Açı hesaplamaları
        angle_knee = calculate_angle(hip, knee, ankle)
        angle_hip = calculate_angle(shoulder, hip, knee)

        # Skorlar
        knee_score = score_angle(angle_knee, knee_target)
        hip_score = score_angle(angle_hip, hip_target)
        total_score = int((knee_score + hip_score) / 2)

        # Ekrana yazılar
        cv2.putText(image, f"Knee: {int(angle_knee)} deg", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(image, f"Hip: {int(angle_hip)} deg", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        cv2.putText(image, f"Aero Score: {total_score}", (30, 130), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

        # Kalibrasyon tuşu (C)
        if calibration_mode:
            save_calibration("onur_bike_fit", {
                "knee_angle": angle_knee,
                "hip_angle": angle_hip
            })
            calibration_mode = False  # sadece bir kez kaydet

        # Noktaları çiz
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

    # Görüntüyü göster
    cv2.imshow('Bike Fit Analyzer', image)

    key = cv2.waitKey(10) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('c'):
        calibration_mode = True  # Kalibrasyon modunu tetikle

cap.release()
cv2.destroyAllWindows()
