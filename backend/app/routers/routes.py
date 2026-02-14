
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
