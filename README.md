# CoachOnur - AI Training

An AI-powered endurance sports coach that analyzes your Garmin data to provide personalized training plans and daily insights. Built with a premium glassmorphic UI, it features a fully functional "View-Only" free tier and a Stripe-powered Pro subscription.

## Features
- **Data Integration**: Automatically fetches and caches activities, sleep, and health metrics directly from Garmin Connect.
- **Social Login**: Frictionless authentication with Google and Facebook via Supabase/OAuth.
- **AI Coaching**: Uses Google Gemini 2.0 to generate highly personalized training advice based on your daily recovery and training load.
- **Professional Training Plans**: Generates detailed 1-Week/1-Month plans with specific paces, watts, and heart rate zones.
- **Structured Workouts**: Exact breakdowns of Warmup, Main Set, and Cooldown for every prescribed session.
- **Multilingual Support**: Comprehensive localization in English, Turkish, German, French, Spanish, Russian, and Italian.
- **Stripe Paywall & Subscriptions**: 
  - **Free Tier**: Users can view their full customized dashboard, see their metrics, and explore past activities for free.
  - **Pro Tier**: Clicking to generate new AI workouts or interact with AI features triggers a beautiful, glassmorphic Stripe Checkout popup for subscription access.
- **Admin Bypass**: Built-in Admin email whitelist to test premium features without crossing the paywall.
- **Smart Device Management**: Intelligent display of your primary Garmin device with connection status.
- **AI Chat Widget**: Interactive AI coach for immediate, conversational feedback on your training and recovery.

## Architecture

- **Backend:** FastAPI (Python 3.10+)
- **Frontend:** React (Vite + TailwindCSS)
- **Database:** PostgreSQL (Production via Render) / SQLite (Dev)
- **AI Brain:** Google Gemini 2.0 Flash
- **Payments:** Stripe Checkout & Webhooks
- **Localization:** i18next & react-i18next

## Project Structure

```
AI-Coach/
├── backend/
│   ├── routers/        # API Endpoints (auth, coach, garmin, settings, payments)
│   ├── services/       # Logic (Garmin Client, Coach Brain, Stripe integration)
│   ├── database.py     # Database & SQLAlchemy config
│   ├── models.py       # User (incl. is_premium flag) & Settings models
│   └── main.py         # Backend entry point
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios API client
│   │   ├── components/ # Localized UI (PremiumPaywallModal, TrainingPlan, etc.)
│   │   ├── i18n.js     # Localization Hub
│   │   ├── App.jsx     # Main Dashboard Logic & Gating
│   │   └── main.jsx    # React bootstrapping
│   ├── public/         # Static assets & background videos
│   └── vite.config.js
├── scripts/            # Utility scripts (e.g., manual DB migrations)
└── sql_app.db          # Development database
```

## Getting Started

### Backend Setup

1.  Navigate to the root directory and activate virtual environment:
    ```bash
    source venv/bin/activate
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Set up environment variables in `.env`:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    DATABASE_URL=postgresql://user:password@host:port/dbname
    ```
4.  Run the server:
    ```bash
    uvicorn backend.main:app --reload
    ```
    *Server runs on `http://localhost:8000`*
    *Swagger Docs: `http://localhost:8000/docs`*
    
### Frontend Setup

1.  Navigate to `frontend`:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables in `.env.local`:
    ```env
    VITE_GOOGLE_CLIENT_ID=your_google_id.apps.googleusercontent.com
    VITE_STRIPE_PUBLIC_KEY=pk_test_...
    VITE_API_URL=http://localhost:8000
    ```
4.  Start development server:
    ```bash
    npm run dev
    ```
    *App runs on `http://localhost:5173`*

### Frontend Configuration
In production (e.g., Vercel, Render), you must set the `VITE_API_URL` environment variable to your deployed backend URL.

### Database
The application supports both **PostgreSQL** (Production) and **SQLite** (Development).
- **Development**: By default, if no `DATABASE_URL` is provided, it defaults to `sqlite:///./sql_app.db`.
- **Production**: Set `DATABASE_URL` in your `.env` file to your PostgreSQL connection string.
