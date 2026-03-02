<div align="center">
  <h1>🏃‍♂️ CoachOnur AI</h1>
  <p><strong>Your Ultimate AI-Powered Endurance Sports Coach</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-coachonurai.com-success?style=for-the-badge)](https://www.coachonurai.com/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
  [![Stripe](https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white)](https://stripe.com/)
</div>

---

**Live Platform:** [https://www.coachonurai.com/](https://www.coachonurai.com/)

> *"Where decades of triathlon coaching experience meet modern full-stack engineering."*
> 
> CoachOnur AI isn't just another generic fitness app. It was born from the exact intersection of grinding through exhausting training blocks and writing scalable Python infrastructure. Having personally completed numerous Triathlons and Ironman races, and as a long-time endurance coach, I built this platform because I wanted an intelligence layer that actually *understands* training load (TSS), recovery bounds, and the complex reality of balancing multi-sport disciplines. 

An AI-powered endurance sports coach that analyzes your Garmin ecosystem data to provide personalized training plans, daily insights, and nutritional breakdowns. Built with a premium UI, it features a fully functional "View-Only" free tier and a Stripe-powered Pro subscription.

## ✨ Key Features

- **Garmin Ecosystem Integration:** Automatically syncs activities, sleep data, HRV, Body Battery, and VO2 Max directly from Garmin Connect.
- **AI Coach (Gemini 2.5 Flash):** Generates bespoke 1-week and 1-month training plans aligned with your physical readiness, specific TSS, and personal goals.
- **Nutrition Vision AI:** Upload a photo of your meal to instantly extract macroscopic nutritional values (Calories, Protein, Carbs, Fats) via advanced AI image analysis.
- **Structured Workouts:** Delivers exact breakdowns of Warmup, Main Set, and Cooldown sequences effortlessly exported to your training regimen.
- **Premium Glassmorphic UI:** A beautifully designed, responsive interface featuring dynamic charts, interactive activity maps, and sleek dark-mode aesthetics.
- **Frictionless Authentication:** Quick and secure social logins via Google and Facebook alongside traditional JWT authentication.
- **Stripe Subscriptions:** Robust paywall integration handling Free (Read-Only) and Pro (AI Interactive) tiers with automated webhooks.
- **Multilingual Support:** Fully localized in 8 languages (🇺🇸 English, 🇹🇷 Turkish, 🇩🇪 German, 🇫🇷 French, 🇪🇸 Spanish, 🇷🇺 Russian, 🇮🇹 Italian, 🇫🇮 Finnish).

## 🏗 Architecture & Tech Stack

CoachOnur AI is built using a modern, scalable architecture designed for high performance and reliability.

### 🎨 Frontend
- **Framework:** React + Vite for lightning-fast HMR and optimized production builds.
- **Styling:** TailwindCSS offering utility-first, fully responsive design.
- **State & Fetching:** Axios for API communication, React Hooks for component state.
- **Localization:** `i18next` & `react-i18next` for seamless, on-the-fly language switching.

### ⚙️ Backend
- **Framework:** FastAPI (Python 3.10+) for asynchronous, high-throughput REST routing.
- **Database:** PostgreSQL (Production) / SQLite (Local Development) utilizing SQLAlchemy ORM.
- **AI Engine:** Google GenAI SDK (Gemini 2.5 Flash vision & text modules).
- **Payments:** Stripe Python SDK handling billing, sessions, and webhooks.

### 🌐 Infrastructure
- **Deployment:** API hosted on **Render**; Database managed via Render PostgreSQL. Domains linked securely via Cloudflare/Vercel mapping.

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

## � Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Custom API Keys (Google Gemini, Stripe, Google OAuth App)

### 1. Backend Installation

```bash
# Clone the repository
git clone https://github.com/kapucuonur/AI-Coach.git
cd AI-Coach

# Setup Python environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the root directory (refer to `.env.example`):
```env
GEMINI_API_KEY=your_gemini_key
JWT_SECRET_KEY=your_secure_jwt_secret
FIELD_ENCRYPT_KEY=your_fernet_crypto_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=sqlite:///./sql_app.db
```

Run the FastAPI development server:
```bash
uvicorn backend.main:app --reload
```
*API is now running on `http://localhost:8000`. View Swagger documentation at `http://localhost:8000/docs`.*

### 2. Frontend Installation

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `/frontend` directory:
```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_id.apps.googleusercontent.com
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

Run the Vite development server:
```bash
npm run dev
```
*Frontend is now accessible at `http://localhost:5173`.*

---

<div align="center">
  <p>Built with ❤️ for endurance athletes by <strong>Onur Kapucu</strong></p>
</div>
