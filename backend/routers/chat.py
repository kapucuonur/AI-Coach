from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from backend.services.coach_brain import CoachBrain
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    role: str  # "user" or "model" (or "system")
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    user_context: Optional[str] = None
    language: str = "en"

@router.post("/")
async def chat_with_coach(request: ChatRequest):
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            raise HTTPException(status_code=500, detail="Gemini API Key not configured.")
        
        brain = CoachBrain(gemini_key)
        
        # Convert Pydantic models to dicts for the brain service
        messages_dicts = [msg.model_dump() for msg in request.messages]
        
        response_text = brain.generate_chat_response(messages_dicts, request.user_context, request.language)
        
        return {"response": response_text}
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
