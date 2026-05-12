import cv2
import mediapipe as mp
from utils.angles import calculate_angle

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()
mp_drawing = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)  # Kameradan görüntü al

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Görüntüyü RGB'ye çevir
    image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(image)

    # Geri BGR yap
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark

        # Kalça (hip), diz (knee), ayak bileği (ankle) noktalarının koordinatlarını al
        hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x,
               landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
        knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x,
                landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
        ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x,
                 landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]

        # Açı hesapla (kalça-diz-ayak bileği)
        angle = calculate_angle(hip, knee, ankle)

        # Görüntüye açıyı yaz
        cv2.putText(image, str(int(angle)),
                    tuple(int(x * image.shape[1]) for x in knee),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        # Noktaları çiz
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

    cv2.imshow('Bike Fit Analyzer', image)

    if cv2.waitKey(10) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
