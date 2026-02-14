
import asyncio
from typing import Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import VirtualRideSession, Activity
from app.services.elevation_service import ElevationService
from app.services.trainer_service import trainer_service

class VirtualRideService:
    def __init__(self, db: Session):
        self.db = db
        self.elevation = ElevationService()
        self.active_sessions: Dict[int, Dict] = {}
    
    async def start_session(self, user_id: int, route_id: int) -> VirtualRideSession:
        from app.services.route_service import RouteService
        route_service = RouteService(self.db)
        route_data = route_service.get_route_for_virtual_ride(route_id)
        
        if not route_data:
            raise ValueError("Rota bulunamadı")
        
        self.elevation.points = [
            type('Point', (), {
                'distance': p['distance'],
                'elevation': p['elevation'],
                'gradient': p['gradient'],
                'lat': p['lat'],
                'lng': p['lng']
            })()
            for p in route_data['elevation_profile']
        ]
        
        session = VirtualRideSession(
            user_id=user_id,
            route_id=route_id,
            status="active",
            current_distance_m=0,
            current_elevation_m=route_data['coordinates'][0]['elevation'],
            current_gradient=0
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        self.active_sessions[user_id] = {
            "session": session,
            "route_data": route_data,
            "start_time": datetime.utcnow(),
            "detailed_data": [],
            "last_gradient": 0.0
        }
        
        return session
    
    async def update_loop(self, user_id: int) -> Optional[Dict]:
        if user_id not in self.active_sessions:
            return None
        
        session_data = self.active_sessions[user_id]
        session = session_data["session"]
        
        trainer_data = trainer_service.get_current_data(user_id)
        speed_kmh = trainer_data.get("speed", 0)
        power = trainer_data.get("power", 0)
        cadence = trainer_data.get("cadence", 0)
        heart_rate = trainer_data.get("heart_rate")
        
        speed_ms = speed_kmh * 1000 / 3600
        distance_delta = speed_ms * 1.0
        session.current_distance_m += distance_delta
        
        position = self.elevation.get_point_at_distance(session.current_distance_m)
        
        if not position or position.get("finished"):
            await self.finish_session(user_id)
            return {"finished": True}
        
        raw_gradient = position["gradient"]
        upcoming = self.elevation.get_upcoming_gradient(
            session.current_distance_m, lookahead=20
        )
        
        simulated_gradient = self._calculate_realistic_gradient(
            raw_gradient=raw_gradient,
            upcoming=upcoming,
            speed=speed_kmh,
            power=power
        )
        
        await self._send_gradient_to_trainer(user_id, simulated_gradient)
        
        session.current_elevation_m = position["elevation"]
        session.current_gradient = simulated_gradient
        session.last_speed_kmh = speed_kmh
        session.last_power = power
        session.last_cadence = cadence
        session.last_heart_rate = heart_rate
        
        self.db.commit()
        
        session_data["detailed_data"].append({
            "time": (datetime.utcnow() - session_data["start_time"]).total_seconds(),
            "distance": session.current_distance_m,
            "elevation": position["elevation"],
            "gradient": simulated_gradient,
            "speed": speed_kmh,
            "power": power,
            "cadence": cadence,
            "heart_rate": heart_rate,
            "lat": position["lat"],
            "lng": position["lng"]
        })
        
        return {
            "session_id": session.id,
            "distance": session.current_distance_m,
            "elevation": position["elevation"],
            "gradient": simulated_gradient,
            "speed": speed_kmh,
            "power": power,
            "cadence": cadence,
            "heart_rate": heart_rate,
            "progress_percent": (session.current_distance_m / 
                              (session_data["route_data"]["distance_km"] * 1000)) * 100,
            "upcoming": upcoming
        }
    
    def _calculate_realistic_gradient(self, raw_gradient: float,
                                     upcoming: Dict, speed: float, power: float) -> float:
        base = raw_gradient
        
        if upcoming.get("is_steepening") and upcoming["change"] > 3:
            anticipation = upcoming["change"] * 0.15
            base += anticipation
        
        speed_factor = 1.0
        if speed < 12 and base > 2:
            speed_factor = 1.1
        
        if power > 350 and base > 5:
            base -= 0.5
        
        final = base * speed_factor
        return round(max(-20, min(20, final)), 1)
    
    async def _send_gradient_to_trainer(self, user_id: int, target: float):
        session_data = self.active_sessions.get(user_id)
        if not session_data:
            return
        
        last = session_data["last_gradient"]
        max_change = 1.5
        
        diff = target - last
        
        if abs(diff) > max_change:
            smoothed = last + max_change if diff > 0 else last - max_change
        else:
            smoothed = target
        
        smoothed = 0.4 * smoothed + 0.6 * last
        
        if abs(smoothed - last) > 0.1:
            await trainer_service.send_gradient_command(user_id, round(smoothed, 1))
            session_data["last_gradient"] = smoothed
    
    async def pause_session(self, user_id: int):
        if user_id in self.active_sessions:
            session = self.active_sessions[user_id]["session"]
            session.status = "paused"
            self.db.commit()
            await trainer_service.send_gradient_command(user_id, 0)
    
    async def resume_session(self, user_id: int):
        if user_id in self.active_sessions:
            session = self.active_sessions[user_id]["session"]
            session.status = "active"
            self.db.commit()
    
    async def finish_session(self, user_id: int) -> Activity:
        session_data = self.active_sessions[user_id]
        session = session_data["session"]
        
        await trainer_service.send_gradient_command(user_id, 0)
        
        detailed = session_data["detailed_data"]
        
        powers = [d["power"] for d in detailed if d["power"] > 0]
        hrs = [d["heart_rate"] for d in detailed if d["heart_rate"]]
        cadences = [d["cadence"] for d in detailed if d["cadence"] > 0]
        
        avg_power = sum(powers) / len(powers) if powers else 0
        duration = detailed[-1]["time"] if detailed else 0
        tss = (duration * avg_power) / (200 * 3600) * 100 if duration > 0 else 0
        
        activity = Activity(
            user_id=user_id,
            route_id=session.route_id,
            duration_seconds=int(duration),
            distance_m=session.current_distance_m,
            total_elevation_gain=session_data["route_data"]["elevation_gain_m"],
            avg_power=int(avg_power),
            max_power=max(powers) if powers else 0,
            normalized_power=int(avg_power),
            tss=round(tss, 1),
            avg_hr=int(sum(hrs) / len(hrs)) if hrs else None,
            max_hr=max(hrs) if hrs else None,
            avg_cadence=int(sum(cadences) / len(cadences)) if cadences else None,
            max_cadence=max(cadences) if cadences else None,
            detailed_data=detailed
        )
        
        self.db.add(activity)
        
        session.status = "completed"
        session.end_time = datetime.utcnow()
        self.db.commit()
        
        del self.active_sessions[user_id]
        
        return activity
    
    async def cancel_session(self, user_id: int):
        if user_id in self.active_sessions:
            await trainer_service.send_gradient_command(user_id, 0)
            session = self.active_sessions[user_id]["session"]
            session.status = "cancelled"
            session.end_time = datetime.utcnow()
            self.db.commit()
            del self.active_sessions[user_id]
    
    def get_status(self, user_id: int) -> Optional[Dict]:
        if user_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[user_id]["session"]
        route_data = self.active_sessions[user_id]["route_data"]
        
        return {
            "session_id": session.id,
            "status": session.status,
            "distance": session.current_distance_m,
            "elevation": session.current_elevation_m,
            "gradient": session.current_gradient,
            "speed": session.last_speed_kmh,
            "power": session.last_power,
            "cadence": session.last_cadence,
            "progress_percent": (session.current_distance_m / 
                                (route_data["distance_km"] * 1000)) * 100
        }
