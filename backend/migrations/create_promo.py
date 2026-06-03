import sys
import os
from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import PromoCode, Base

def create_promo():
    # Make sure tables exist (since we just added them to models)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    code_str = "TEAM7"
    
    existing = db.query(PromoCode).filter(PromoCode.code == code_str).first()
    if not existing:
        promo = PromoCode(
            code=code_str,
            duration_days=7,
            max_uses=0, # unlimited
            times_used=0,
            is_active=True
        )
        db.add(promo)
        db.commit()
        print(f"Created promo code: {code_str} (Duration: 7 days, Uses: unlimited)")
    else:
        print(f"Promo code {code_str} already exists.")

if __name__ == "__main__":
    create_promo()
