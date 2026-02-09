from pydantic import BaseModel

class GarminLoginSchema(BaseModel):
    email: str
    password: str
