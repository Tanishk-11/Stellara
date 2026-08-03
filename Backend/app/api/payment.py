import os
import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.models import User
from app.core.security import get_current_user
from pydantic import BaseModel

router = APIRouter()

# In production, make sure to add these to your .env file
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "secret_placeholder")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

def get_db():
    db = SessionLocal() 
    try:
        yield db
    finally:
        db.close()

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

@router.post("/create-order")
def create_order(current_user: User = Depends(get_current_user)):
    try:
        data = {
            "amount": 99900,  # Amount is in paise (₹999.00)
            "currency": "INR",
            "receipt": f"receipt_{current_user.id}",
            "notes": {
                "user_id": current_user.id,
                "email": current_user.email
            } 
        }
        order = client.order.create(data=data)
        
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID # Frontend needs this to open the popup
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-payment")
def verify_payment(data: PaymentVerification, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Called by the frontend after Razorpay popup successfully completes the transaction.
    """
    try:
        # Verify the signature
        client.utility.verify_payment_signature({
            'razorpay_order_id': data.razorpay_order_id,
            'razorpay_payment_id': data.razorpay_payment_id,
            'razorpay_signature': data.razorpay_signature
        })
        
        # If the code reaches here, the payment is authentic
        current_user.tier = "Premium"
        db.commit()
        
        return {"status": "success", "message": "Successfully upgraded to Premium!"}
        
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid payment signature. Payment verification failed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
