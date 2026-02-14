
import math
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class ElevationPoint:
    distance: float
    elevation: float
    lat: float
    lng: float
    gradient: float = 0.0

class ElevationService:
    def __init__(self):
        self.points: List[ElevationPoint] = []
    
    def calculate_from_coordinates(self, coords: List[Dict]) -> List[ElevationPoint]:
        self.points = []
        total_dist = 0.0
        
        for i, coord in enumerate(coords):
            if i > 0:
                dist = self._haversine_distance(
                    coords[i-1]["lat"], coords[i-1]["lng"],
                    coord["lat"], coord["lng"]
                )
                total_dist += dist
            
            self.points.append(ElevationPoint(
                distance=total_dist,
                elevation=coord.get("elevation", 0),
                lat=coord["lat"],
                lng=coord["lng"]
            ))
        
        self._calculate_gradients()
        return self.points
    
    def _haversine_distance(self, lat1: float, lon1: float,
                           lat2: float, lon2: float) -> float:
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_phi / 2) ** 2 + 
             math.cos(phi1) * math.cos(phi2) * 
             math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def _calculate_gradients(self, window_size: int = 3):
        if len(self.points) < 2:
            return
        
        for i in range(1, len(self.points)):
            prev = self.points[i - 1]
            curr = self.points[i]
            
            elevation_diff = curr.elevation - prev.elevation
            distance = curr.distance - prev.distance
            
            if distance > 0:
                gradient = (elevation_diff / distance) * 100
                gradient = max(-30, min(30, gradient))
            else:
                gradient = 0
            
            self.points[i].gradient = gradient
        
        if len(self.points) > window_size:
            smoothed = []
            half_window = window_size // 2
            
            for i in range(len(self.points)):
                start = max(0, i - half_window)
                end = min(len(self.points), i + half_window + 1)
                window = [self.points[j].gradient for j in range(start, end)]
                avg = sum(window) / len(window)
                smoothed.append(avg)
            
            for i in range(len(self.points)):
                self.points[i].gradient = round(smoothed[i], 2)
    
    def get_point_at_distance(self, distance: float) -> Dict:
        if not self.points or distance < 0:
            return None
        
        if distance >= self.points[-1].distance:
            last = self.points[-1]
            return {
                "distance": last.distance,
                "elevation": last.elevation,
                "gradient": 0,
                "lat": last.lat,
                "lng": last.lng,
                "finished": True
            }
        
        for i in range(len(self.points) - 1):
            p1 = self.points[i]
            p2 = self.points[i + 1]
            
            if p1.distance <= distance <= p2.distance:
                ratio = (distance - p1.distance) / (p2.distance - p1.distance)
                
                return {
                    "distance": distance,
                    "elevation": p1.elevation + (p2.elevation - p1.elevation) * ratio,
                    "gradient": p1.gradient + (p2.gradient - p1.gradient) * ratio,
                    "lat": p1.lat + (p2.lat - p1.lat) * ratio,
                    "lng": p1.lng + (p2.lng - p1.lng) * ratio,
                    "finished": False
                }
        
        return None
    
    def get_upcoming_gradient(self, distance: float, lookahead: float = 30.0) -> Dict:
        current = self.get_point_at_distance(distance)
        future = self.get_point_at_distance(distance + lookahead)
        
        if not current or not future:
            return {"change": 0, "is_steepening": False}
        
        change = future["gradient"] - current["gradient"]
        
        return {
            "current_gradient": current["gradient"],
            "future_gradient": future["gradient"],
            "change": round(change, 2),
            "is_steepening": change > 2,
            "is_easing": change < -2
        }
    
    def to_dict(self) -> List[Dict]:
        return [{
            "distance": p.distance,
            "elevation": p.elevation,
            "gradient": p.gradient,
            "lat": p.lat,
            "lng": p.lng
        } for p in self.points]
