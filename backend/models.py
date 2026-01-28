from sqlalchemy import Column, Integer, String, JSON
from backend.database import Base

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON) # Store complex objects like 'metrics' or 'races' as JSON
