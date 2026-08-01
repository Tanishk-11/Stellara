from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import shutil
import os

# Internal imports
from app.core.database import SessionLocal
from app.core.models import ConstellationImage, User
from app.core.security import get_current_user
from app.services.visions import predict_constellation

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
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # STEP 1: Create the file path
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        # STEP 2: Save the raw binary file to your server
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # STEP 3: Pass the saved file path to your Computer Vision model
        # Because we wrapped it as a LangChain @tool, we invoke it with a dictionary
        predictions = predict_constellation.invoke({"image_path": file_path})
        
        # STEP 4: Save to Database
        # (We wrap predictions in str() just in case it returns a dictionary of scores)
        new_image_record = ConstellationImage(
            user_id=current_user.id, 
            image_url=file_path, 
            detected_constellation=str(predictions)
        )
        
        # STEP 5: Add, commit, refresh, and return!
        db.add(new_image_record)
        db.commit()
        db.refresh(new_image_record)
        
        return {
            "message": "Image successfully analyzed",
            "predictions": predictions,
            "database_id": new_image_record.id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")