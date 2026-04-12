<div align="center">
  <h1>🏃‍♂️ CoachOnur AI</h1>
  <p><strong>🚀 Production-ready AI coaching platform used to analyze real athlete data and generate intelligent training decisions.</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-coachonurai.com-success?style=for-the-badge)](https://www.coachonurai.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)](https://stripe.com/)
</div>

---

**Live Platform:** [https://www.coachonurai.com/](https://www.coachonurai.com/)

> *"Where decades of triathlon coaching experience meet modern full-stack engineering."*

CoachOnur AI isn't just another generic fitness app. It was born from the exact intersection of grinding through exhausting training blocks and writing scalable Python infrastructure. Having personally completed numerous Triathlons and Ironman races, and as a long-time endurance coach, I built this platform because I wanted an intelligence layer that actually *understands* training load (TSS), recovery bounds, and the complex reality of balancing multi-sport disciplines.

---

## 🔥 Live Proof

- ✅ **Real Garmin Data Sync:** Full OAuth2 integration with the Garmin Connect ecosystem.
- ✅ **Production Processing:** 1000+ activities processed and analyzed.
- ✅ **AI-Generated Training Plans:** Real-time generation of athlete-specific training regimens.
- ✅ **Stripe Live Subscriptions:** Robust, production-ready payment and subscription management.

### 📊 Example Intelligence Output
> "Recovery: **LOW**  
> Reason: Sleep debt + HRV suppression detected over 48h trend.  
> Advice: Avoid high-intensity training. Pivot to 30min Zone 1 active recovery or rest."

---

## 🎥 Demo

[Watch the Full Demo Video](https://www.coachonurai.com/) *(Add video link here)*

1. **Secure Login:** JWT & Social Auth flow.
2. **Garmin Connection:** Seamless OAuth2 handshake.
3. **Data Ingestion:** Real-time sync of HRV, Sleep, and Activity metrics.
4. **AI Analysis:** Personalized coaching output based on the last 30 days of load.

---

## 🤖 AI Intelligence Layer

Unlike rule-based systems, CoachOnur AI leverages a context-aware intelligence layer:

- **Contextual Athlete Analysis:** Evaluates sleep quality, HRV trends, and TSS (Training Stress Score) in unison.
- **Trend Evaluation:** Identifies multi-day fatigue patterns that individual data points might miss.
- **Personalized Logic:** Generates coaching advice that adapts to the user's specific performance bounds, not generic templates.
- **Gemini 2.5 Flash Powered:** Optimized for low-latency, high-reasoning output for real-time coaching decisions.

---

## ✨ Key Features

- **Garmin Ecosystem Integration:** Automatically syncs activities, sleep data, HRV, Body Battery, and VO2 Max.
- **Nutrition Vision AI:** Upload meal photos to extract Macros (Calories, Protein, Carbs, Fats) via AI image analysis.
- **Structured Workouts:** Precise breakdowns of Warmup, Main Set, and Cooldown sequences.
- **Premium Glassmorphic UI:** A sleek, responsive interface featuring dynamic charts and interactive activity maps.
- **Stripe Subscriptions:** Fully automated Free and Pro tiers with live webhook synchronization.
- **Multilingual Support:** Fully localized in 8 languages.

---

## 🧠 System Design

- **Async FastAPI Backend:** High-throughput, non-blocking architecture for concurrent API calls.
- **Background Task Processing:** Reliable Garmin data synchronization and AI processing jobs.
- **Stateless API Layer:** Designed for horizontal scalability.
- **PostgreSQL Persistence:** Structured, relational data storage for complex athlete metrics.

---

## ⚙️ Engineering Decisions

- **FastAPI for Performance:** Selected for its native `asyncio` support, crucial for handling external API latencies (Garmin/Stripe) without blocking.
- **PostgreSQL for Integrity:** Used for structured storage of sensitive athlete data and relational training plan mapping.
- **Gemini Flash for Latency:** Integrated specifically for low-latency responses, ensuring the coaching experience feels instantaneous.
- **Stripe Webhooks:** Implemented a robust webhook listener to ensure reliable subscription state sync across the platform.

---

## 🏗 Tech Stack

### 🎨 Frontend
- React + Vite, TailwindCSS, Axios, i18next.

### ⚙️ Backend
- FastAPI (Python 3.10+), SQLAlchemy ORM, Google GenAI SDK (Gemini), Stripe SDK.

### 🌐 Infrastructure
- **Self-hosted:** Raspberry Pi 5 (16GB RAM) with Hailo-8 AI Accelerator (26 TOPS)
- **Cloudflare Tunnel:** Zero-trust secure HTTPS routing
- **Supabase:** PostgreSQL cloud database
- **Cloudflare/Vercel:** Secure DNS and frontend mapping.

---

## 📁 Project Structure

```text
AI-Coach/
├── backend/
│   ├── routers/        # API Endpoints (auth, coach, garmin, payments, nutrition)
│   ├── services/       # Core Logic (Garmin Client, Coach Brain, Data Processors)
│   ├── utils.py        # Shared utilities (JSON sanitization, data formatters)
│   ├── models.py       # SQLAlchemy Database Schemas
│   └── main.py         # FastAPI App Entry Point
├── frontend/
│   ├── src/
│   │   ├── components/ # Reusable UI components (Charts, Modals, Nav, Analytics)
│   │   ├── api/        # Axios interceptors and requests
│   │   ├── App.jsx     # Main Application Router & Gating Logic
│   │   └── i18n.js     # Internationalization config hub
│   └── public/         # Static assets (fonts, video backgrounds, icons)
├── tests/              # Pytest backend testing infrastructure
└── render.yaml         # Render Infrastructure-as-Code Configuration
```

---

## 🚀 Getting Started Locally

### Prerequisites
- Python 3.10+, Node.js 18+
- API Keys: Google Gemini, Stripe, Google OAuth.

### 1. Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

<div align="center">
  <p>Built with ❤️ for endurance athletes by <strong>Onur Kapucu</strong></p>
</div>
# updated
