from datetime import datetime
from sqlalchemy import Column, Integer, String, JSON, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # Native app password (optional for social logins)
    google_id = Column(String, unique=True, nullable=True, index=True)
    facebook_id = Column(String, unique=True, nullable=True, index=True)
    
    # Garmin Linked Account Data
    # In a prod environment, garmin_password SHOULD BE ENCRYPTED, NOT HASHED
    # because the Garmin API needs the raw password to log in.
    garmin_email = Column(String, nullable=True) 
    garmin_password = Column(String, nullable=True)
    
    # Monetization - Stripe Integration
    from sqlalchemy import Boolean
    is_premium = Column(Boolean, default=False)
    stripe_customer_id = Column(String, unique=True, index=True, nullable=True)
    stripe_subscription_id = Column(String, unique=True, index=True, nullable=True)
    subscription_status = Column(String, default="inactive")
    premium_valid_until = Column(DateTime, nullable=True)  # For promo codes / temporary premium
    
    # Telegram Integration
    telegram_chat_id = Column(String, unique=True, index=True, nullable=True)
    telegram_link_code = Column(String, nullable=True)

    # Trial Period Tracking
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    nutrition_entries = relationship("NutritionEntry", back_populates="user")
    settings = relationship("UserSetting", back_populates="user")
    promo_usages = relationship("PromoCodeUsage", back_populates="user")

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    key = Column(String, index=True)  # No longer globally unique — scoped per user
    value = Column(JSON)  # Store complex objects like 'metrics' or 'races' as JSON

    # Relationship back to User (optional convenience)
    user = relationship("User", back_populates="settings")

class PromoCode(Base):
    __tablename__ = "promo_codes"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    duration_days = Column(Integer, default=7, nullable=False)
    max_uses = Column(Integer, default=0, nullable=False)  # 0 means unlimited
    times_used = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    usages = relationship("PromoCodeUsage", back_populates="promo_code")

class PromoCodeUsage(Base):
    __tablename__ = "promo_code_usages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    promo_code_id = Column(Integer, ForeignKey("promo_codes.id"), nullable=False, index=True)
    used_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="promo_usages")
    promo_code = relationship("PromoCode", back_populates="usages")

class NutritionEntry(Base):
    __tablename__ = "nutrition_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, ForeignKey("users.email"), nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    meal_time = Column(DateTime, nullable=False)
    
    # Nutrition data
    calories = Column(Float, nullable=False)
    protein = Column(Float, nullable=False)  # grams
    carbs = Column(Float, nullable=False)  # grams
    fats = Column(Float, nullable=False)  # grams
    
    # AI analysis
    food_description = Column(String, nullable=False)
    confidence = Column(String, nullable=True)
    
    # Image data (optional, base64)
    image_data = Column(String, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="nutrition_entries")
