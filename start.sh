#!/bin/bash
# A strict start script for Render that ensures uvicorn runs without --reload for production stability

echo "Starting AI Coach Backend (Production Mode)"
# Ensure gunicorn/uvicorn starts the FASTAPI app on the port provided by Render
uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000} --workers 2
