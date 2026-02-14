
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
import asyncio
import json

from app.database import get_db
from app.schemas import VirtualRideStart
from app.services.virtual_ride_service import VirtualRideService
from app.services.trainer_service import trainer_service
from app.dependencies import get_current_active_user
from app.config import WS_TIMEOUT

router = APIRouter()

active_services: dict = {}

@router.post("/start")
async def start_virtual_ride(
    data: VirtualRideStart,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    service = VirtualRideService(db)
    active_services[current_user.id] = service
    
    session = await service.start_session(current_user.id, data.route_id)
    
    return {
        "session_id": session.id,
        "status": "started",
        "route_id": data.route_id
    }

@router.websocket("/ws/ride/{user_id}")
async def virtual_ride_websocket(websocket: WebSocket, user_id: int):
    await websocket.accept()
    
    if user_id not in active_services:
        await websocket.send_json({
            "type": "ERROR",
            "message": "No active session. Call /start first."
        })
        await websocket.close()
        return
    
    service = active_services[user_id]
    
    try:
        while True:
            status = await service.update_loop(user_id)
            
            if not status:
                break
            
            if status.get("finished"):
                await websocket.send_json({
                    "type": "RIDE_COMPLETE",
                    "data": status
                })
                break
            
            await websocket.send_json({
                "type": "RIDE_UPDATE",
                "data": status
            })
            
            try:
                # Client'tan veri bekle (non-blocking)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=1.0
                )
                message = json.loads(data)
                
                if message.get("type") == "TRAINER_DATA":
                    await trainer_service.receive_trainer_data(user_id, message.get("data", {}))
                elif message.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                    
            except asyncio.TimeoutError:
                pass  # Normal, devam et
            
            await asyncio.sleep(0.5)
            
    except WebSocketDisconnect:
        await service.pause_session(user_id)
    except Exception as e:
        print(f"Virtual ride error: {e}")
        await websocket.send_json({"type": "ERROR", "message": str(e)})
    finally:
        await trainer_service.disconnect(user_id)

@router.post("/pause/{user_id}")
async def pause_ride(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_id in active_services:
        await active_services[user_id].pause_session(user_id)
    return {"status": "paused"}

@router.post("/resume/{user_id}")
async def resume_ride(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_id in active_services:
        await active_services[user_id].resume_session(user_id)
    return {"status": "resumed"}

@router.post("/finish/{user_id}")
async def finish_ride(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if user_id not in active_services:
        return {"status": "no_active_session"}
    
    activity = await active_services[user_id].finish_session(user_id)
    
    del active_services[user_id]
    
    return {
        "status": "completed",
        "activity_id": activity.id,
        "duration": activity.duration_seconds,
        "tss": activity.tss
    }
