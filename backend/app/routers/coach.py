
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.services.coach_service import CoachService
from app.dependencies import get_current_active_user
from app.models import User

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class AdviceResponse(BaseModel):
    advice: str

@router.get("/daily-advice", response_model=AdviceResponse)
async def get_daily_advice(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = CoachService(db)
    advice = await service.get_daily_advice(current_user.id)
    return {"advice": advice}

@router.post("/chat", response_model=AdviceResponse)
async def chat_with_coach(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = CoachService(db)
    response = await service.chat_with_coach(current_user.id, request.message)
    return {"advice": response}

@router.post("/generate-plan")
async def generate_plan(
    weeks: int = 4,
    focus: str = "FTP Builder",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = CoachService(db)
    plan = await service.generate_training_plan(current_user.id, weeks, focus)
    return plan

@router.get("/analyze/{activity_id}")
async def analyze_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    service = CoachService(db)
    analysis = await service.analyze_activity(activity_id)
    return {"analysis": analysis}
