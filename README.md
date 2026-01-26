# AI Coach

An AI-powered endurance sports coach that analyzes your Garmin data to provide personalized training plans and daily insights.

## Features (Planned)
- **Data Integration**: Fetches activities, sleep, and health metrics from Garmin Connect.
- **AI Coaching**: Uses LLMs to generate personalized training advice based on recovery and load.
- **Adaptive Planning**: Adjusts your schedule based on daily biometrics (HRV, Sleep).

## Architecture

- **Backend:** FastAPI (Python)
- **Frontend:** React (Vite + Tailwind)
- **Database:** SQLite (SQLAlchemy)
- **AI:** Google Gemini 2.0 Flash

## Project Structure

```
AI-Coach/
├── backend/
│   ├── routers/        # API Endpoints (auth, coach, settings)
│   ├── services/       # Core Logic (Garmin Client, AI Brain)
│   ├── database.py     # SQLite Configuration
│   ├── models.py       # DB Tables
│   └── main.py         # App Entry Point
├── frontend/           # React Application
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

### Database
The application uses **SQLite**. The database file `sql_app.db` will be automatically created in the root directory upon the first backend start. No manual setup required.
