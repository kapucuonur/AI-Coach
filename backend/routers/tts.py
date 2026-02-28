import os
import io
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import edge_tts

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language: str = "tr"  # Default to Turkish

@router.post("/generate")
async def generate_speech(request: TTSRequest):
    try:
        # Markdown cleanup (if frontend sends some stray markup)
        text = request.text.replace("**", "").replace("*", "").replace("#", "")
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        # Map frontend language to best edge_tts voice
        voice = "en-US-AriaNeural" # fallback
        if request.language.startswith("tr"):
            voice = "tr-TR-EmelNeural" # High quality Turkish female neural voice
        elif request.language.startswith("de"):
            voice = "de-DE-KatjaNeural"
        elif request.language.startswith("fr"):
            voice = "fr-FR-DeniseNeural"
        elif request.language.startswith("es"):
            voice = "es-ES-ElviraNeural"
        elif request.language.startswith("it"):
            voice = "it-IT-ElsaNeural"
        elif request.language.startswith("ru"):
            voice = "ru-RU-SvetlanaNeural"

        # Note: edge_tts uses asyncio. We can capture output using communicate()
        communicate = edge_tts.Communicate(text, voice)
        
        # Generator for streaming response
        async def audio_stream():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    yield chunk["data"]

        return StreamingResponse(audio_stream(), media_type="audio/mpeg")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
