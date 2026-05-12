import cv2
import mediapipe as mp
from utils.angles import calculate_angle
from utils.score import score_angle
from calibration.calibration import save_calibration
from model.predict import predict_ideal_angles

USER_HEIGHT = 178
USER_LEG_LENGTH = 88
USER_TORSO_LENGTH = 64

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_drawing = mp.solutions.drawing_utils

predicted = predict_ideal_angles(USER_HEIGHT, USER_LEG_LENGTH, USER_TORSO_LENGTH)
if predicted is None:
    print("Model bulunamadı, ml_model.py ile eğitin.")
    exit()

hip_target = predicted['hip_angle']
knee_target = predicted['knee_angle']

# Örnek hedef açı değerleri (bunları ileride modelle genişletebilirsin)
elbow_target = 90    # Dirsek açısı (örnek)
torso_target = 45    # Üst gövde açısı (örnek)
ankle_target = 90    # Ayak bileği açısı (örnek)

cap = cv2.VideoCapture(0)
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

        # Temel noktalar
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
        shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x,
                    landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
        elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
        wrist = [landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value].y]
        foot_index = [landmarks[mp_pose.PoseLandmark.LEFT_FOOT_INDEX.value].x,
                      landmarks[mp_pose.PoseLandmark.LEFT_FOOT_INDEX.value].y]

        # Açı hesaplamaları
        angle_knee = calculate_angle(hip, knee, ankle)
        angle_hip = calculate_angle(shoulder, hip, knee)
        angle_elbow = calculate_angle(shoulder, elbow, wrist)
        angle_torso = calculate_angle(elbow, shoulder, hip)
        angle_ankle = calculate_angle(knee, ankle, foot_index)

        # Skorlar
        knee_score = score_angle(angle_knee, knee_target)
        hip_score = score_angle(angle_hip, hip_target)
        elbow_score = score_angle(angle_elbow, elbow_target)
        torso_score = score_angle(angle_torso, torso_target)
        ankle_score = score_angle(angle_ankle, ankle_target)

        total_score = int((knee_score + hip_score + elbow_score + torso_score + ankle_score) / 5)

        # Görüntü üzerine yazdırma
        cv2.putText(image, f"Knee: {int(angle_knee)} deg", (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(image, f"Hip: {int(angle_hip)} deg", (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        cv2.putText(image, f"Elbow: {int(angle_elbow)} deg", (30, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        cv2.putText(image, f"Torso: {int(angle_torso)} deg", (30, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2)
        cv2.putText(image, f"Ankle: {int(angle_ankle)} deg", (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 127, 80), 2)
        cv2.putText(image, f"Aero Score: {total_score}", (30, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

        if calibration_mode:
            save_calibration("onur_bike_fit", {
                "knee_angle": angle_knee,
                "hip_angle": angle_hip,
                "elbow_angle": angle_elbow,
                "torso_angle": angle_torso,
                "ankle_angle": angle_ankle,
            })
            calibration_mode = False

        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

    cv2.imshow('Bike Fit Analyzer', image)

    key = cv2.waitKey(10) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('c'):
        calibration_mode = True

cap.release()
cv2.destroyAllWindows()
