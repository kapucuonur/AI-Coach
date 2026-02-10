# AI Coach

An AI-powered endurance sports coach that analyzes your Garmin data to provide personalized training plans and daily insights.

## Features
- **Data Integration**: Fetches activities, sleep, and health metrics from Garmin Connect.
- **AI Coaching**: Uses Google Gemini 2.0 to generate personalized training advice based on recovery and load.
- **Professional Training Plans**: Generates detailed 1-Week/1-Month plans with specific paces, watts, and heart rate zones.
- **Structured Workouts**: breakdown of Warmup, Main Set, and Cooldown for every session.
- **Multilingual Support**: Fully localized in English, Turkish, German, French, Spanish, Russian, and Italian.
- **Smart Caching**: Implements a Singleton pattern for Garmin connections to prevent rate limiting (429 errors) and ensure stability on ephemeral servers (Render).

## Architecture

- **Backend:** FastAPI (Python)
- **Frontend:** React (Vite + Tailwind + Lucide Icons)
- **Database:** PostgreSQL (Production) / SQLite (Dev) (SQLAlchemy)
- **AI:** Google Gemini 2.0 Flash
- **Authentication:** Garmin Connect (Session Caching in RAM)

## Project Structure

```
AI-Coach/
├── backend/
│   ├── routers/        # API Endpoints (auth, coach, settings, dashboard)
│   ├── services/       # Core Logic (Garmin Client, AI Brain, Data Processing)
│   ├── database.py     # Database Configuration
│   ├── models.py       # DB Models
│   └── main.py         # App Entry Point
├── frontend/           # React Application
│   ├── src/
│   │   ├── api/        # Axios Client Config
│   │   ├── components/ # Reusable UI Components
│   │   ├── pages/      # Page Views
│   │   ├── App.jsx     # Main Layout
│   │   └── main.jsx    # React Entry Point
│   ├── public/         # Static Assets
│   └── vite.config.js  # Vite Configuration
├── tests/              # Unit & Integration Tests
└── sql_app.db          # Local Database (Auto-created)
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
