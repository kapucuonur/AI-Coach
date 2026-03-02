import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import json
from datetime import datetime

from backend.routers.nutrition import validate_nutrition

def test_validate_nutrition_bounds():
    # Test valid
    data = {"food_description": "Apple", "calories": 100, "protein": 1, "carbs": 25, "fats": 0.5}
    res = validate_nutrition(data.copy())
    assert res == data
    
    # Test missing field
    with pytest.raises(ValueError, match="Missing field"):
        validate_nutrition({"food_description": "Apple", "calories": 100})
        
    # Test bounds capping
    oversize = {"food_description": "Giant Burger", "calories": 9000, "protein": 900, "carbs": -50, "fats": 500}
    res = validate_nutrition(oversize)
    assert res["calories"] == 5000.0
    assert res["protein"] == 500.0
    assert res["carbs"] == 0.0
    assert res["fats"] == 300.0

def test_analyze_food_invalid_mime(client, test_user_token):
    # Pass a txt file as an image upload
    headers = {"Authorization": f"Bearer {test_user_token}"}
    files = {"file": ("test.txt", b"dummy content", "text/plain")}
    response = client.post("/api/nutrition/analyze-food", headers=headers, files=files)
    
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]

def test_analyze_food_oversized_file(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    # Create an 11MB file payload in memory
    large_content = b"0" * (11 * 1024 * 1024)
    files = {"file": ("big_image.jpg", large_content, "image/jpeg")}
    response = client.post("/api/nutrition/analyze-food", headers=headers, files=files)
    
    assert response.status_code == 413
    assert "File too large" in response.json()["detail"]

@patch('backend.routers.nutrition.get_gemini_client')
def test_analyze_food_success(mock_get_client, client, test_user_token):
    # Set up mock vision API client
    mock_client_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "food_description": "Banana",
        "calories": 105,
        "protein": 1.3,
        "carbs": 27.0,
        "fats": 0.3,
        "confidence": "high"
    })
    mock_client_instance.models.generate_content.return_value = mock_response
    mock_get_client.return_value = mock_client_instance
    
    headers = {"Authorization": f"Bearer {test_user_token}"}
    files = {"file": ("banana.jpg", b"fake_image_bytes", "image/jpeg")}
    
    response = client.post("/api/nutrition/analyze-food", headers=headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["food_description"] == "Banana"
    assert data["calories"] == 105.0

def test_nutrition_today(client, test_user_token, db_session):
    # Insert some dummy entries for today for the test user
    from backend.models import NutritionEntry
    entry1 = NutritionEntry(
        user_email="test@coachonurai.com",
        meal_time=datetime.utcnow(),
        food_description="Apple", calories=100, protein=0, carbs=25, fats=0
    )
    entry2 = NutritionEntry(
        user_email="test@coachonurai.com",
        meal_time=datetime.utcnow(),
        food_description="Banana", calories=105, protein=1, carbs=27, fats=0
    )
    db_session.add(entry1)
    db_session.add(entry2)
    db_session.commit()
    
    headers = {"Authorization": f"Bearer {test_user_token}"}
    response = client.get("/api/nutrition/today?timezone_offset=0", headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert "date" in data
    assert len(data["entries"]) >= 2
    assert data["totals"]["calories"] >= 205.0

def test_nutrition_history_pagination(client, test_user_token, db_session):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    # Fetch first page with limits
    response = client.get("/api/nutrition/history?days=30&page=1&page_size=1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) <= 1  # Should be 1 because of the DB additions in previous block (run in same DB file or session if not flushed)
