from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from sqlalchemy.orm import Session
import shutil
import os

# Internal imports
from app.core.database import SessionLocal
from app.core.models import ConstellationImage, User
from app.core.security import get_current_user
from app.services.visions import predict_constellation
from app.services.agent import ask_stargazer

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Ensure an uploads directory exists on the server
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/detect")
def detect_constellation(
    file: UploadFile = File(...), 
    lat: Optional[float] = Form(None),
    lon: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # STEP 1: Create the file path
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        # STEP 2: Save the raw binary file to your server
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # STEP 3: Ask the Agent to analyze the image AND check sky visibility
        location_str = f"My location is Latitude: {lat}, Longitude: {lon}." if lat and lon else "I do not have my location available."
        prompt = f"I just uploaded an image to my sensors at {file_path}. Please use your predict_constellation tool to analyze it. After you get the results, check if that constellation is actually visible right now ({location_str}). Give me your final analysis!"
        
        agent_response = ask_stargazer(
            user_message=prompt, 
            session_id=str(current_user.id), 
            user_name=current_user.name
        )
        
        # STEP 4: Upload to Cloudinary for permanent storage (Premium Feature)
        cloud_url = file_path # Fallback to local ephemeral path for free users
        try:
            import cloudinary
            import cloudinary.uploader
            
            # TODO: In the future, replace this with: is_premium_user = current_user.is_premium
            is_premium_user = False 
            
            # Only upload to premium cloud storage if they are a premium user and the URL is set
            if os.getenv("CLOUDINARY_URL") and is_premium_user:
                upload_result = cloudinary.uploader.upload(file_path)
                cloud_url = upload_result.get("secure_url", file_path)
        except Exception as e:
            print(f"Cloudinary upload failed: {e}")

        # STEP 5: Save to Database
        new_image_record = ConstellationImage(
            user_id=current_user.id, 
            image_url=cloud_url, 
            detected_constellation=agent_response
        )
        
        # STEP 6: Add, commit, refresh, and return!
        db.add(new_image_record)
        db.commit()
        db.refresh(new_image_record)
        
        return {
            "message": "Image successfully analyzed by Stargazer",
            "predictions": agent_response,
            "database_id": new_image_record.id,
            "cloud_url": cloud_url
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")