#!/bin/bash

# Setup Backend
echo "🚀 Setting up Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists, if not create from example or ask user
if [ ! -f "../.env" ]; then
    echo "⚠️  .env file not found! creating minimal .env..."
    echo "SECRET_KEY=dev-secret" > ../.env
    echo "DATABASE_URL=sqlite:///./sql_app.db" >> ../.env
    echo "GEMINI_API_KEY=your_key_here" >> ../.env
fi

echo "✅ Backend Setup Complete"
echo "Starting Backend Server..."
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# Setup Frontend
echo "🚀 Setting up Frontend..."
cd ../frontend
echo "Installing frontend dependencies..."
npm install

echo "✅ Frontend Setup Complete"
echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

# Handle exit
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
