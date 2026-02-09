from pydantic import BaseModel

class GarminLoginSchema(BaseModel):
    email: str
    password: str
    mfa_code: Optional[str] = None
