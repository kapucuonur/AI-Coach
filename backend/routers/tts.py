import os
import io
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

try:
    import edge_tts
except ImportError:
    edge_tts = None

try:
    from gtts import gTTS
except ImportError:
    gTTS = None

router = APIRouter()

class TTSRequest(BaseModel):
    text: str
    language: str = "tr"  # Default to Turkish

@router.post("/generate")
async def generate_speech(request: TTSRequest):
    try:
        import re
        # Remove markdown stars/hashes
        text = request.text.replace("**", "").replace("*", "").replace("#", "")
        # Remove emojis (common unicode blocks)
        text = re.sub(r'[^\w\s.,!?:;\-\'\"\(\)]', '', text)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        if edge_tts is not None:
            # Use edge_tts High-Quality Neural Voices
            voice = "en-US-AriaNeural"
            if request.language.startswith("tr"):
                voice = "tr-TR-EmelNeural"
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

            communicate = edge_tts.Communicate(text, voice)
            
            async def audio_stream():
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        yield chunk["data"]

            return StreamingResponse(audio_stream(), media_type="audio/mpeg")
            
        elif gTTS is not None:
            # Fallback to standard Google TTS if edge_tts failed to install (Python 3.13 issues, etc.)
            lang_code = request.language.split("-")[0]
            tts = gTTS(text=text, lang=lang_code, slow=False)
            
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            
            return StreamingResponse(mp3_fp, media_type="audio/mpeg")
            
        else:
            raise HTTPException(status_code=500, detail="No TTS libraries available (edge-tts or gTTS).")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
