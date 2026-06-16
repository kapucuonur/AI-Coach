# BikeFit AI 🚴‍♂️🤖

**The Professional AI-Powered Cycling Position Analysis Platform**

BikeFit AI is a state-of-the-art SaaS platform designed to provide cyclists and coaches with expert-level bike fitting feedback using real-time computer vision and smart sensor data.

## 🚀 Key Features

### 1. Real-Time AI Pose Estimation
- **YOLOv8 Engine:** Utilizes the advanced `yolov8n-pose` model for high-frequency human joint tracking.
- **Dynamic Feedback:** Analyzes Knee, Hip, Elbow, Torso, and Ankle angles in real-time.
- **Expert System:** Provides actionable advice (e.g., "Raise Saddle", "Lower Handlebars") based on professional cycling standards.

### 2. Multi-Discipline Support
- **Road Bike Mode:** Optimized for traditional road cycling efficiency and comfort.
- **Triathlon/TT Mode:** Specifically tuned for aggressive aerodynamic positions and elbow-pad alignments.

### 3. Smart Sensor Integration (IoT)
- **Web Bluetooth (BLE):** Directly connects to Smart Trainers and Cycling Sensors (Power, Cadence, Speed) via the browser.
- **Data Overlay:** Displays live telemetry alongside video analysis for a holistic performance view.

### 4. Advanced Geometry Calibration
- **Manual Pin Mode:** Allows users to calibrate their bike by marking Front/Rear Hubs, Bottom Bracket, and Saddle.
- **Real-World Measurements:** Converts pixel data into precise centimeters using user-provided Wheelbase and Crank Length metadata.
- **KOPS Analysis:** Calculates Knee Over Pedal Spindle alignment for optimal power transfer.

### 5. Active Learning Pipeline
- **Self-Training Data Engine:** Automatically collects user-verified calibration frames to build a proprietary bicycle keypoint dataset.
- **Future-Proof:** Designed to evolve into a fully automated bicycle detection system.

## 🛠 Tech Stack
- **Backend:** FastAPI (Python), OpenCV, Ultralytics (YOLOv8), NumPy.
- **Frontend:** HTML5, Vanilla CSS, JavaScript (ES6+), Web Bluetooth API.
- **Infrastructure:** Raspberry Pi 5, Nginx, Systemd.

## 📦 Deployment
The application is optimized for deployment on **Raspberry Pi 5**, utilizing hardware acceleration for real-time inference.

```bash
# Start the API
sudo systemctl start bikefit-api
```

## 📄 License
**Proprietary License.** Copyright © 2025 Onur Kapucu. All Rights Reserved.
Unauthorized use, reproduction, or distribution is strictly prohibited. For licensing inquiries, contact the owner.

---
*Built with ❤️ for the cycling community by Onur Kapucu.*
