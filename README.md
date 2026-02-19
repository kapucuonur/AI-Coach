# AI Coach

An AI-powered endurance sports coach that analyzes your Garmin data to provide personalized training plans and daily insights.

## Features
- **Data Integration**: Fetches activities, sleep, and health metrics from Garmin Connect.
- **AI Coaching**: Uses Google Gemini 2.0 to generate personalized training advice based on recovery and load.
- **Professional Training Plans**: Generates detailed 1-Week/1-Month plans with specific paces, watts, and heart rate zones.
- **Structured Workouts**: Breakdown of Warmup, Main Set, and Cooldown for every session.
- **Multilingual Support**: Comprehensive localization in English, Turkish, German, French, Spanish, Russian, and Italian using `i18next`.
- **Interactive Dashboard**: Real-time stats cards for Resting HR, VO2 Max, Stress, Body Battery, and Sleep.
- **Yearly Progression**: Visual analytics of distance and activity distribution across sports.
- **Device Management**: Intelligent display of your primary Garmin device with connection status.
- **AI Chat Widget**: Interactive AI coach for immediate feedback on training and recovery.
- **Smart Caching**: Implements stability patterns for Garmin connections to prevent rate limiting.

## Architecture

- **Backend:** FastAPI (Python 3.10+)
- **Frontend:** React (Vite + Vanilla CSS)
- **Database:** PostgreSQL (Production) / SQLite (Dev)
- **AI Brain:** Google Gemini 2.0 Flash
- **Localization:** i18next / react-i18next

## Project Structure

```
AI-Coach/
├── backend/
│   ├── routers/        # API Endpoints (auth, coach, garmin, settings)
│   ├── services/       # Logic (Garmin Client, Coach Brain, Daily Briefing)
│   ├── database.py     # Database & SQLAlchemy config
│   ├── models.py       # User & Settings models
│   └── main.py         # Backend entry point
├── frontend/
│   ├── src/
│   │   ├── api/        # Axios API client
│   │   ├── components/ # Localized UI (TrainingPlan, ActivityList, ChatWidget, etc.)
│   │   ├── i18n.js     # Localization Hub
│   │   ├── App.jsx     # Main Dashboard Logic
│   │   └── main.jsx    # React bootstrapping
│   ├── public/         # Static assets & videos
│   └── vite.config.js
├── scripts/            # Utility scripts (e.g., token management)
└── sql_app.db          # Development database
```

## Getting Started

### Backend Setup

1.  Navigate to the root directory:
    ```bash
    source venv/bin/activate
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Set up environment variables in `.env`:
    ```
    GARMIN_EMAIL=your_email
    GARMIN_PASSWORD=your_password
    GEMINI_API_KEY=your_api_key
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
3.  Start development server:
    ```bash
    npm run dev
    ```
    *App runs on `http://localhost:5173` (or similar)*

### Frontend Configuration
In production (e.g., Vercel, Render), you must set the `VITE_API_URL` environment variable to your deployed backend URL.

- **Local**: Defaults to `http://localhost:8000`
- **Production**: Set `VITE_API_URL=https://your-backend-url.com` in your deployment settings.

### Database
The application supports both **PostgreSQL** (Production) and **SQLite** (Development).

- **Development**: By default, if no `DATABASE_URL` is provided, it defaults to `sqlite:///./sql_app.db`.
- **Production**: Set `DATABASE_URL` in your `.env` file to your PostgreSQL connection string.
  ```env
  DATABASE_URL=postgresql://user:password@host:port/dbname
  ```
