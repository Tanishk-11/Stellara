from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr  
    password: str   

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    tier: str

    class Config:
        from_attributes = True

class ConstellationImageCreate(BaseModel):
    image_url: str

class ConstellationImageResponse(BaseModel):
    id: int
    user_id: int
    image_url:str
    detected_constellation:str
    uploaded_at:datetime
    class Config:
        from_attributes=True

class ChatHistoryCreate(BaseModel):
    user_id:int
    user_msg:str

class ChatHistoryResponse(BaseModel):
    id:int
    user_id:int
    user_msg:str
    agent_reply:str
    timestamp:datetime
    class Config:
        from_attributes=True