
import gpxpy
import gpxpy.gpx
from pathlib import Path
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.models import Route
from app.services.elevation_service import ElevationService

class RouteService:
    def __init__(self, db: Session):
        self.db = db
        self.elevation_service = ElevationService()
    
    def import_gpx(self, file_path: str, name: str, description: str = "",
                   country: str = "Unknown", difficulty: int = 3) -> Route:
        with open(file_path, 'r') as f:
            gpx = gpxpy.parse(f)
        
        coords = []
        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coords.append({
                        "lat": point.latitude,
                        "lng": point.longitude,
                        "elevation": point.elevation or 0
                    })
        
        if not coords:
            raise ValueError("GPX dosyasında koordinat bulunamadı")
        
        elevation_points = self.elevation_service.calculate_from_coordinates(coords)
        
        total_distance = elevation_points[-1].distance / 1000
        total_elevation = sum(
            max(0, elevation_points[i].elevation - elevation_points[i-1].elevation)
            for i in range(1, len(elevation_points))
        )
        
        gradients = [p.gradient for p in elevation_points[1:]]
        max_gradient = max(gradients) if gradients else 0
        avg_gradient = sum(gradients) / len(gradients) if gradients else 0
        
        db_route = Route(
            name=name,
            description=description,
            country=country,
            distance_km=total_distance,
            elevation_gain_m=total_elevation,
            max_gradient=round(max_gradient, 2),
            avg_gradient=round(avg_gradient, 2),
            difficulty=difficulty,
            gpx_file=file_path,
            elevation_profile=self.elevation_service.to_dict(),
            coordinates=[{"lat": p.lat, "lng": p.lng, "elevation": p.elevation} 
                      for p in elevation_points]
        )
        
        self.db.add(db_route)
        self.db.commit()
        self.db.refresh(db_route)
        
        return db_route
    
    def get_route(self, route_id: int) -> Optional[Route]:
        return self.db.query(Route).filter(Route.id == route_id).first()
    
    def list_routes(self, country: Optional[str] = None,
                   max_distance: Optional[float] = None,
                   difficulty: Optional[int] = None) -> List[Route]:
        query = self.db.query(Route)
        
        if country:
            query = query.filter(Route.country == country)
        if max_distance:
            query = query.filter(Route.distance_km <= max_distance)
        if difficulty:
            query = query.filter(Route.difficulty == difficulty)
        
        return query.order_by(Route.popularity.desc()).all()
    
        return {
            "id": route.id,
            "name": route.name,
            "distance_km": route.distance_km,
            "elevation_gain_m": route.elevation_gain_m,
            "max_gradient": route.max_gradient,
            "coordinates": route.coordinates,
            "elevation_profile": route.elevation_profile
        }

    def create_synthetic_route(self, name: str, description: str, country: str,
                             distance_km: float, elevation_gain_m: float,
                             points: List[Dict]) -> Route:
        
        # Calculate gradients for the synthetic points
        elevation_points = self.elevation_service.calculate_from_coordinates(points)
        
        gradients = [p.gradient for p in elevation_points[1:]]
        max_gradient = max(gradients) if gradients else 0
        avg_gradient = sum(gradients) / len(gradients) if gradients else 0
        
        db_route = Route(
            name=name,
            description=description,
            country=country,
            distance_km=distance_km,
            elevation_gain_m=elevation_gain_m,
            max_gradient=round(max_gradient, 2),
            avg_gradient=round(avg_gradient, 2),
            difficulty=1,
            gpx_file="synthetic",
            elevation_profile=self.elevation_service.to_dict(),
            coordinates=[{"lat": p.lat, "lng": p.lng, "elevation": p.elevation} 
                      for p in elevation_points]
        )
        
        self.db.add(db_route)
        self.db.commit()
        self.db.refresh(db_route)
        
        return db_route
