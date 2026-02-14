
from typing import Optional, Dict
import asyncio
from datetime import datetime

class SmartTrainerService:
    def __init__(self):
        self.active_connections: Dict[int, any] = {}
        self.trainer_data: Dict[int, Dict] = {}
    
    async def connect(self, user_id: int, websocket):
        self.active_connections[user_id] = websocket
        self.trainer_data[user_id] = {
            "power": 0,
            "cadence": 0,
            "speed": 0.0,
            "heart_rate": None,
            "last_update": None
        }
    
    async def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        if user_id in self.trainer_data:
            del self.trainer_data[user_id]
    
    async def receive_trainer_data(self, user_id: int, data: Dict):
        self.trainer_data[user_id] = {
            "power": data.get("power", 0),
            "cadence": data.get("cadence", 0),
            "speed": data.get("speed", 0.0),
            "heart_rate": data.get("heart_rate"),
            "last_update": datetime.utcnow().isoformat()
        }
    
    def get_current_data(self, user_id: int) -> Dict:
        return self.trainer_data.get(user_id, {
            "power": 0, "cadence": 0, "speed": 0.0, "heart_rate": None
        })
    
    async def send_gradient_command(self, user_id: int, gradient: float):
        if user_id in self.active_connections:
            websocket = self.active_connections[user_id]
            await websocket.send_json({
                "type": "SET_SLOPE",
                "gradient": gradient
            })

trainer_service = SmartTrainerService()
