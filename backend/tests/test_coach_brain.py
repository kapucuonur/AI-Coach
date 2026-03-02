import pytest
from unittest.mock import patch, MagicMock
import json

from backend.services.coach_brain import CoachBrain

@pytest.fixture
def mock_brain():
    # Instantiate CoachBrain with Mocked Gemini API Key
    with patch("os.getenv", return_value="mocked_gemini_key"):
        # We can also mock genai.Client inside __init__ to prevent actual initialization issues
        with patch("google.genai.Client"):
            brain = CoachBrain()
            return brain

def test_coach_brain_initialization_no_key():
    with patch("os.getenv", return_value=None):
        with pytest.raises(ValueError, match="GEMINI_API_KEY is missing."):
            CoachBrain()

def test_get_target_language(mock_brain):
    assert mock_brain._get_target_language("tr") == "Turkish"
    assert mock_brain._get_target_language("TR") == "Turkish"
    assert mock_brain._get_target_language("EN") == "English"
    assert mock_brain._get_target_language("unknown") == "English" # fallback

def test_clean_json_response_valid(mock_brain):
    raw_json = '{"advice_text": "Hello", "workout": null}'
    cleaned = mock_brain._clean_json_response(raw_json)
    assert json.loads(cleaned)["advice_text"] == "Hello"

def test_clean_json_response_with_markdown(mock_brain):
    markdown_json = '''```json
    {"advice_text": "With markdown", "workout": null}
    ```'''
    cleaned = mock_brain._clean_json_response(markdown_json)
    assert json.loads(cleaned)["advice_text"] == "With markdown"

def test_clean_json_response_recovery(mock_brain):
    # Some junk text before and after the actual JSON block
    junk_json = 'Here is your advice: {"advice_text": "Recovered!", "workout": null} Enjoy!'
    cleaned = mock_brain._clean_json_response(junk_json)
    assert json.loads(cleaned)["advice_text"] == "Recovered!"

def test_clean_json_response_unrecoverable(mock_brain):
    bad_string = "I am an AI and I completely failed to output JSON."
    cleaned = mock_brain._clean_json_response(bad_string)
    parsed = json.loads(cleaned)
    assert parsed["advice_text"] == "AI response formatting error"
    assert parsed["workout"] is None

@patch.object(CoachBrain, '_call_gemini_with_retry')
def test_generate_daily_advice_rest_day(mock_call, mock_brain):
    # Mock the Gemini API returning a valid JSON string
    mock_response = MagicMock()
    mock_response.text = '{"advice_text": "You need rest.", "workout": null}'
    mock_call.return_value = mock_response

    # Give a setting that says Today (assuming current weekday aligns or just pass the logic)
    # The brain uses `client_local_time` to determine the day name. Let's fix a date:
    # 2026-03-02 is a Monday
    user_settings = {"off_days": ["Monday"], "language": "en"}
    
    result_str = mock_brain.generate_daily_advice(
        user_profile={"fullName": "Test Athlete"},
        activities_summary="100 TSS this week",
        health_stats={},
        sleep_data={},
        user_settings=user_settings,
        client_local_time="2026-03-02T10:00:00.000Z"
    )
    
    result = json.loads(result_str)
    assert result["advice_text"] == "You need rest."
    
    # Assert that the prompt contained the REST DAY critical instruction
    prompt_sent = mock_call.call_args[0][0]
    assert "Monday" in prompt_sent
    assert "OFF DAY (Rest Day)" in prompt_sent

@patch.object(CoachBrain, '_call_gemini_with_retry')
def test_generate_structured_plan(mock_call, mock_brain):
    mock_response = MagicMock()
    mock_response.text = '{"title": "Test Plan", "weeks": []}'
    mock_call.return_value = mock_response

    result_str = mock_brain.generate_structured_plan(
        duration_str="1 Month",
        user_profile={"fullName": "John Doe", "vo2MaxRunning": 50},
        activities_summary="Ran 50km this month",
        health_stats={"restingHeartRate": 55},
        user_settings={"language": "tr"}
    )
    
    result = json.loads(result_str)
    assert result["title"] == "Test Plan"
    
    prompt_sent = mock_call.call_args[0][0]
    assert "John Doe" in prompt_sent
    assert "50 ml/kg/min" in prompt_sent
    # Turkish check: language TR requested
    assert "TURKISH" in prompt_sent.upper()
