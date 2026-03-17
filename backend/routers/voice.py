from fastapi import APIRouter, Request, Response
from twilio.twiml.voice_response import VoiceResponse, Gather
import os
import google.generativeai as genai
from services.coach_brain import CoachBrain # Assuming logic exists there

router = APIRouter()

# Initialize Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

@router.post("/incoming")
async def handle_incoming_call(request: Request):
    """
    Twilio Webhook: Triggered when the Garmin watch initiates a phone call.
    """
    response = VoiceResponse()
    
    # 1. Welcome the athlete
    response.say("Coach Onur AI activated. How can I help with your training today?", voice='Polly.Amy')
    
    # 2. Gather speech input
    gather = Gather(input='speech', action='/api/voice/process', timeout=5, language='en-US')
    response.append(gather)
    
    # 3. If no input, hang up or retry
    response.say("I didn't catch that. Please try calling again when you're ready.")
    
    return Response(content=str(response), media_type="application/xml")

@router.post("/process")
async def process_voice_input(request: Request):
    """
    Callback from Twilio Gather: Processes the transcribed text.
    """
    form_data = await request.form()
    user_speech = form_data.get("SpeechResult", "")
    
    response = VoiceResponse()
    
    if user_speech:
        # 1. Send to Gemini for a "Coach" style response
        # In a real scenario, we'd pull the user's latest Garmin data here
        prompt = f"You are Coach Onur, an expert triathlon coach. An athlete just said: '{user_speech}'. Give a very brief, motivating, and professional coach response in 2 sentences max."
        
        try:
            ai_response = model.generate_content(prompt)
            coach_text = ai_response.text.strip()
        except Exception as e:
            coach_text = "I'm having trouble connecting to my coaching brain, but keep pushing hard!"

        # 2. Speak the response back
        response.say(coach_text, voice='Polly.Amy')
        
        # 3. Allow follow-up
        gather = Gather(input='speech', action='/api/voice/process', timeout=3)
        response.append(gather)
    else:
        response.say("Good job on your session. Talk to you later!")

    return Response(content=str(response), media_type="application/xml")
