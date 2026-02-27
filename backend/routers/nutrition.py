import os
import base64
import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google import genai
from google.genai import types

from backend.database import get_db
from backend.auth_utils import get_current_user
from backend.models import NutritionEntry, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/nutrition", tags=["nutrition"])

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

@router.post("/analyze-food", response_model=NutritionAnalysis)
async def analyze_food_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze food photo using Gemini Vision API to extract nutrition info
    """
    try:
        # Read and encode image
        image_data = await file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        # Configure Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        client = genai.Client(api_key=gemini_key)
        
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
            model='gemini-2.5-flash',
            contents=[
                prompt,
                types.Part.from_bytes(data=image_data, mime_type=file.content_type or "image/jpeg")
            ],
            config=types.GenerateContentConfig(response_mime_type="application/json")
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
        
        nutrition_data = json.loads(response_text)
        
        # Save to database
        entry = NutritionEntry(
            user_email=current_user.email,
            meal_time=datetime.utcnow(),
            food_description=nutrition_data["food_description"],
            calories=float(nutrition_data["calories"]),
            protein=float(nutrition_data["protein"]),
            carbs=float(nutrition_data["carbs"]),
            fats=float(nutrition_data["fats"]),
            confidence=nutrition_data.get("confidence"),
            image_data=base64_image[:1000]  # Store thumbnail (first 1KB)
        )
        
        db.add(entry)
        db.commit()
        db.refresh(entry)
        
        logger.info(f"Nutrition entry created for {current_user.email}: {nutrition_data['food_description']}")
        
        return NutritionAnalysis(**nutrition_data)
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response: {e}")
        raise HTTPException(status_code=500, detail="AI response parsing failed")
    except Exception as e:
        logger.error(f"Food analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/today", response_model=dict)
def get_today_nutrition(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's nutrition totals"""
    from datetime import date
    
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    entries = db.query(NutritionEntry).filter(
        NutritionEntry.user_email == current_user.email,
        NutritionEntry.meal_time >= today_start
    ).all()
    
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

@router.get("/history")
def get_nutrition_history(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get nutrition history for the past N days"""
    from datetime import date, timedelta
    
    start_date = datetime.combine(date.today() - timedelta(days=days), datetime.min.time())
    
    entries = db.query(NutritionEntry).filter(
        NutritionEntry.user_email == current_user.email,
        NutritionEntry.meal_time >= start_date
    ).order_by(NutritionEntry.meal_time.desc()).all()
    
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
