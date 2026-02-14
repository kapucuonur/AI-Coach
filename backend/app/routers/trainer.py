
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
from app.services.trainer_service import trainer_service
from app.config import WS_PING_INTERVAL, WS_TIMEOUT

router = APIRouter()

@router.websocket("/ws/{user_id}")
async def trainer_websocket(websocket: WebSocket, user_id: int):
    await websocket.accept()
    await trainer_service.connect(user_id, websocket)
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=WS_TIMEOUT
                )
                
                message = json.loads(data)
                
                if message.get("type") == "TRAINER_DATA":
                    await trainer_service.receive_trainer_data(user_id, message.get("data", {}))
                elif message.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                    
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "SERVER_PING"})
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Trainer WS error: {e}")
    finally:
        await trainer_service.disconnect(user_id)
