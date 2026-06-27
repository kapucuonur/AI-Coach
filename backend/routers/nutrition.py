import os
import base64
import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google import genai

from backend.database import get_db
from backend.auth_utils import get_current_user
from backend.models import NutritionEntry, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/nutrition", tags=["nutrition"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

_gemini_client = None

def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        _gemini_client = genai.Client(api_key=key)
    return _gemini_client

class NutritionAnalysis(BaseModel):
    food_description: str
    calories: float
    protein: float  # grams
    carbs: float  # grams
    fats: float  # grams
    confidence: Optional[str] = None

class NutritionEntryResponse(BaseModel):
    id: int
    meal_time: datetime
    food_description: str
    calories: float
    protein: float
    carbs: float
    fats: float
    confidence: Optional[str]

class NutritionTotals(BaseModel):
    calories: float
    protein: float
    carbs: float
    fats: float

class TodayNutritionResponse(BaseModel):
    date: str
    totals: NutritionTotals
    entries: list[NutritionEntryResponse]

class NutritionHistoryResponse(BaseModel):
    entries: list[NutritionEntryResponse]

def validate_nutrition(data: dict) -> dict:
    required = ["food_description", "calories", "protein", "carbs", "fats"]
    for field in required:
        if field not in data:
            raise ValueError(f"Missing field: {field}")
    
    # Sensible bounds
    data["calories"] = max(0.0, min(5000.0, float(data["calories"])))
    data["protein"] = max(0.0, min(500.0, float(data["protein"])))
    data["carbs"] = max(0.0, min(500.0, float(data["carbs"])))
    data["fats"] = max(0.0, min(300.0, float(data["fats"])))
    return data

@router.post("/analyze-food", response_model=NutritionAnalysis)
async def analyze_food_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze food photo using Gemini Vision API to extract nutrition info
    """
    # MIME type check
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {ALLOWED_TYPES}"
        )
        
    try:
        # File size check via stream
        image_data = await file.read()
        if len(image_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413, 
                detail=f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024}MB"
            )
            
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Pull global client singleton
        client = get_gemini_client()
        model_name = 'gemini-2.5-flash'
        
        # Create prompt for nutrition analysis
        prompt = """Analyze this food image and provide nutritional information in the following JSON format:
{
  "food_description": "brief description of the food items",
  "calories": estimated total calories (number),
  "protein": estimated protein in grams (number),
  "carbs": estimated carbohydrates in grams (number),
  "fats": estimated fats in grams (number),
  "confidence": "high/medium/low based on image clarity and portion size visibility"
}

Be as accurate as possible based on standard portion sizes. If multiple items, sum the totals.
Return ONLY the JSON, no other text."""
        
        # Generate response
        response = client.models.generate_content(
            model=model_name,
            contents=[
                prompt,
                {"inline_data": {"mime_type": file.content_type or "image/jpeg", "data": base64_image}}
            ]
        )
        
        # Parse JSON response
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        nutrition_data = validate_nutrition(json.loads(response_text))
        
        # Save to database
        entry = NutritionEntry(
            user_email=current_user.email,
            meal_time=datetime.utcnow(),
            food_description=nutrition_data["food_description"],
            calories=nutrition_data["calories"],
            protein=nutrition_data["protein"],
            carbs=nutrition_data["carbs"],
            fats=nutrition_data["fats"],
            confidence=nutrition_data.get("confidence")
            # Omitting image_data to prevent DB bloat
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        logger.info(f"Nutrition entry created for {current_user.email}: {nutrition_data['food_description']}")
        
        return NutritionAnalysis(**nutrition_data)
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        raise HTTPException(status_code=500, detail="AI response parsing failed")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Food analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/today", response_model=TodayNutritionResponse)
async def get_today_nutrition(
    timezone_offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's nutrition totals respecting user's local timezone offset in minutes."""
    from datetime import date, timezone, timedelta
    import asyncio
    
    # Calculate equivalent start of day in UTC using offset
    # offset is usually client timezone offset in minutes
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    if timezone_offset != 0:
         today_start = today_start + timedelta(minutes=timezone_offset)
    
    # Run concurrently via thread wrapper matching updated async standard
    def load_db():
        return db.query(NutritionEntry).filter(
            NutritionEntry.user_email == current_user.email,
            NutritionEntry.meal_time >= today_start
        ).all()
        
    entries = await asyncio.to_thread(load_db)
    
    total_calories = sum(e.calories for e in entries)
    total_protein = sum(e.protein for e in entries)
    total_carbs = sum(e.carbs for e in entries)
    total_fats = sum(e.fats for e in entries)
    
    return {
        "date": date.today().isoformat(),
        "totals": {
            "calories": total_calories,
            "protein": total_protein,
            "carbs": total_carbs,
            "fats": total_fats
        },
        "entries": [
            NutritionEntryResponse(
                id=e.id,
                meal_time=e.meal_time,
                food_description=e.food_description,
                calories=e.calories,
                protein=e.protein,
                carbs=e.carbs,
                fats=e.fats,
                confidence=e.confidence
            ) for e in entries
        ]
    }

@router.get("/history", response_model=NutritionHistoryResponse)
async def get_nutrition_history(
    days: int = 7,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get nutrition history for the past N days with pagination"""
    from datetime import date, timedelta
    import asyncio
    
    days = min(days, 90) # Cap at 90 days query scope
    offset = (page - 1) * page_size
    
    start_date = datetime.combine(date.today() - timedelta(days=days), datetime.min.time())
    
    def fetch_history_db():
        return db.query(NutritionEntry).filter(
            NutritionEntry.user_email == current_user.email,
            NutritionEntry.meal_time >= start_date
        ).order_by(NutritionEntry.meal_time.desc()).offset(offset).limit(page_size).all()
        
    entries = await asyncio.to_thread(fetch_history_db)
    
    return {
        "entries": [
            NutritionEntryResponse(
                id=e.id,
                meal_time=e.meal_time,
                food_description=e.food_description,
                calories=e.calories,
                protein=e.protein,
                carbs=e.carbs,
                fats=e.fats,
                confidence=e.confidence
            ) for e in entries
        ]
    }
