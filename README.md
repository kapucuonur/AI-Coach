# 🏃‍♂️ CoachOnur AI - Live! 🎯

**Live Platform:** [https://www.coachonurai.com/](https://www.coachonurai.com/)

An AI-powered endurance sports coach that analyzes your Garmin data to provide personalized training plans, daily insights, and nutritional breakdowns. Built with a premium UI, it features a fully functional "View-Only" free tier and a Stripe-powered Pro subscription.

## 🚀 Features
- **Production-Ready Deployment**: Hosted on Render with custom domain (`coachonurai.com`), HTTPS/SSL, and PostgreSQL infrastructure.
- **Data Integration**: Automatically fetches and caches activities, sleep, and health metrics directly from the Garmin Connect ecosystem.
- **Social Login**: Frictionless authentication with Google and Facebook via standard OAuth integration.
- **AI Coaching Engine**: Uses Google Gemini 2.5 Flash to generate highly personalized training advice based on your daily recovery, TSS, and training load.
- **Nutrition Vision AI**: Upload food photos to instantly extract macronutrients (Calories, Protein, Carbs, Fats) via AI image analysis.
- **Professional Training Plans**: Generates detailed 1-Week/1-Month plans with specific paces, watts, and heart rate zones.
- **Structured Workouts**: Exact breakdowns of Warmup, Main Set, and Cooldown for every prescribed session effortlessly pushed to your device.
- **Multilingual Support**: Comprehensive localization in 8 languages (English, Turkish, German, French, Spanish, Russian, Italian, Finnish).
- **Stripe Subscriptions**: 
  - **Free Tier**: Users can view their full customized dashboard, see their metrics, and explore past activities for free.
  - **Pro Tier**: Clicking to generate new AI workouts or interact with AI features triggers a sleek Stripe payment flow for full coaching access.

## 🏗️ Architecture

- **Backend:** FastAPI (Python 3.10+)
- **Frontend:** React (Vite + TailwindCSS)
- **Database:** PostgreSQL (Production via Render) / SQLite (Dev)
- **AI Engine:** Google Gemini 2.5 Flash
- **Payments:** Stripe Checkout & Webhooks
- **Localization:** i18next & react-i18next

## 📁 Project Structure

```text
AI-Coach/
├── backend/           # API Endpoints (FastAPI) & Business Logic
├── frontend/          # React SPA (Vite, Tailwind)
├── tests/             # Pytest Infrastructure 
├── migrate_*.py       # DB Migration Scripts
├── ...
```

## 🛠️ Getting Started Locally

### 1. Backend Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
Set up `.env` (refer to `.env.example`).
```bash
uvicorn backend.main:app --reload
```
*API docs available at `http://localhost:8000/docs`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend available at `http://localhost:5173`*

---
*Built for endurance athletes by Onur Kapucu.*
