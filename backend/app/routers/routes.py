
from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas import Route, RouteSummary
from app.services.route_service import RouteService
from app.dependencies import get_current_active_user
import tempfile
import os

router = APIRouter()

@router.get("/", response_model=List[RouteSummary])
def list_routes(
    country: Optional[str] = None,
    max_distance: Optional[float] = None,
    difficulty: Optional[int] = None,
    db: Session = Depends(get_db)
):
    service = RouteService(db)
    routes = service.list_routes(country, max_distance, difficulty)
    return routes

@router.get("/{route_id}", response_model=Route)
def get_route(route_id: int, db: Session = Depends(get_db)):
    service = RouteService(db)
    route = service.get_route(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route

@router.post("/import")
def import_gpx(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    country: str = Form("Unknown"),
    difficulty: int = Form(3),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".gpx") as tmp:
        tmp.write(file.file.read())
        tmp_path = tmp.name
    
    try:
        service = RouteService(db)
        route = service.import_gpx(tmp_path, name, description, country, difficulty)
        return route
    finally:
        os.unlink(tmp_path)

@router.post("/free-ride")
def create_free_ride_route(
    lat: float,
    lng: float,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    service = RouteService(db)
    # Generate a 20km square loop around the point
    # 1 deg lat ~= 111km -> 5km ~= 0.045 deg
    delta = 0.045
    
    # Simple Square Loop (North -> East -> South -> West)
    points = [
        {"lat": lat, "lng": lng, "elevation": 0},
        {"lat": lat + delta, "lng": lng, "elevation": 0},          # 5km North
        {"lat": lat + delta, "lng": lng + delta, "elevation": 0},  # 5km East
        {"lat": lat, "lng": lng + delta, "elevation": 0},          # 5km South
        {"lat": lat, "lng": lng, "elevation": 0}                   # 5km West (Back to start)
    ]
    
    # We need more granularity for the simulation to work smoothly
    # Let's interpolate points every ~100m
    detailed_points = []
    for i in range(len(points) - 1):
        p1 = points[i]
        p2 = points[i+1]
        
        # Linear interpolation
        steps = 50 
        for j in range(steps):
            t = j / steps
            detailed_points.append({
                "lat": p1["lat"] + (p2["lat"] - p1["lat"]) * t,
                "lng": p1["lng"] + (p2["lng"] - p1["lng"]) * t,
                "elevation": 0 + (p2["elevation"] - p1["elevation"]) * t
            })
            
    detailed_points.append(points[-1])
    
    # Create the route
    route = service.create_synthetic_route(
        name="Özgür Sürüş", 
        description=f"Map Location: {lat:.4f}, {lng:.4f}",
        country="World",
        distance_km=20.0,
        elevation_gain_m=0,
        points=detailed_points
    )
    
    return route
