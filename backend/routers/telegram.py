import os
import secrets
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.auth_utils import get_current_user, is_user_premium
from backend.services.coach_brain import CoachBrain

router = APIRouter(tags=["telegram"])

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_API_URL = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}" if TELEGRAM_BOT_TOKEN else None

brain = CoachBrain()

async def send_telegram_message(chat_id: int, text: str):
    if not TELEGRAM_API_URL:
        print(f"TELEGRAM SIMULATION to {chat_id}: {text}")
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{TELEGRAM_API_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text}
        )

@router.get("/generate-link-code")
def generate_link_code(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = secrets.token_hex(3).upper()
    current_user.telegram_link_code = code
    db.commit()
    return {"code": code, "linked_chat_id": current_user.telegram_chat_id}

@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored"}
        
    if "message" not in data:
        return {"status": "ignored"}
        
    message = data["message"]
    chat_id = message.get("chat", {}).get("id")
    text = message.get("text", "").strip()
    
    if not chat_id or not text:
        return {"status": "ignored"}
        
    # Handle linking
    if text.startswith("/link "):
        code = text.split("/link ")[1].strip()
        user = db.query(User).filter(User.telegram_link_code == code).first()
        if user:
            user.telegram_chat_id = str(chat_id)
            user.telegram_link_code = None # Consume the code
            db.commit()
            await send_telegram_message(chat_id, f"✅ Successfully linked your Telegram account! You can now chat with your AI Coach.")
        else:
            await send_telegram_message(chat_id, "❌ Invalid linking code. Please check your web dashboard and try again.")
        return {"status": "ok"}
        
    if text.startswith("/start"):
        await send_telegram_message(chat_id, "🏃‍♂️ Welcome to AI Coach! Please go to your web dashboard (coachonurai.com), generate a Telegram Link Code from settings, and send it here as: /link YOUR_CODE")
        return {"status": "ok"}
        
    # Normal chat
    user = db.query(User).filter(User.telegram_chat_id == str(chat_id)).first()
    if not user:
        await send_telegram_message(chat_id, "⚠️ Your account is not linked. Please use /link YOUR_CODE first.")
        return {"status": "ok"}
        
    # Check Premium
    if not is_user_premium(user):
        await send_telegram_message(chat_id, "🔒 This feature is only available for CoachOnur Pro members. Please visit the website to upgrade your account.")
        return {"status": "ok"}
        
    # Send acknowledgment and process AI request
    await send_telegram_message(chat_id, "🤔 Thinking...")
    
    try:
        # Fetch settings and cached training plan
        from backend.models import UserSetting
        import json
        
        settings_key = f"{user.email.lower()}_config"
        plan_key = f"{user.email.lower()}_latest_plan"
        
        user_settings = db.query(UserSetting).filter(
            UserSetting.key == settings_key,
            UserSetting.user_id == user.id
        ).first()
        
        latest_plan = db.query(UserSetting).filter(
            UserSetting.key == plan_key,
            UserSetting.user_id == user.id
        ).first()
        
        user_context = {
            "source": "telegram",
            "athlete_name": user.email.split("@")[0],
            "settings": user_settings.value if user_settings else "No settings found.",
            "latest_training_plan": latest_plan.value if latest_plan else "No generated training plan found. Tell the user to open the Plan tab on the dashboard to generate one."
        }
        
        # Format message for Gemini
        messages = [{"role": "user", "content": text}]
        
        response = brain.generate_chat_response(messages, user_context=user_context, language="en")
        
        # Send chunks if response is too long, but usually it's fine
        await send_telegram_message(chat_id, response)
        
    except Exception as e:
        print(f"Telegram AI Error: {e}")
        await send_telegram_message(chat_id, "❌ Sorry, I encountered an error while processing your request. Please try again.")
    
    return {"status": "ok"}
