from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel

from backend.database import get_db
from backend.models import User, PromoCode, PromoCodeUsage
from backend.auth_utils import get_current_user

router = APIRouter(
    prefix="/promo",
    tags=["Promo"]
)

class PromoRedeemRequest(BaseModel):
    code: str

class PromoRedeemResponse(BaseModel):
    message: str
    premium_valid_until: datetime

@router.post("/redeem", response_model=PromoRedeemResponse)
def redeem_promo_code(
    request: PromoRedeemRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the code (case-insensitive usually, but let's just make it upper)
    code_str = request.code.strip().upper()
    promo = db.query(PromoCode).filter(PromoCode.code == code_str).first()

    if not promo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid promo code.")

    if not promo.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This promo code is no longer active.")

    if promo.max_uses > 0 and promo.times_used >= promo.max_uses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This promo code has reached its usage limit.")

    # Check if this specific user has already used this code
    existing_usage = db.query(PromoCodeUsage).filter(
        PromoCodeUsage.user_id == current_user.id,
        PromoCodeUsage.promo_code_id == promo.id
    ).first()

    if existing_usage:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You have already redeemed this promo code.")

    # Calculate new premium_valid_until
    now = datetime.utcnow()
    # If they already have temporary premium time, we append to it. 
    # Or, we just start from today if their premium has expired.
    if current_user.premium_valid_until and current_user.premium_valid_until > now:
        new_valid_until = current_user.premium_valid_until + timedelta(days=promo.duration_days)
    else:
        new_valid_until = now + timedelta(days=promo.duration_days)

    # Update user
    current_user.premium_valid_until = new_valid_until
    
    # Track usage
    promo.times_used += 1
    
    usage_record = PromoCodeUsage(
        user_id=current_user.id,
        promo_code_id=promo.id,
        used_at=now
    )
    
    db.add(usage_record)
    db.commit()
    db.refresh(current_user)

    return PromoRedeemResponse(
        message=f"Successfully redeemed promo code! Premium access granted for {promo.duration_days} days.",
        premium_valid_until=new_valid_until
    )
