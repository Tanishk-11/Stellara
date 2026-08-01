from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import your database engine and the Base blueprint
from app.core.database import engine, Base

# Import your newly built routers!
from app.api import auth, chat, image, payment

# 1. Tell SQLAlchemy to build the actual tables in PostgreSQL 
# (It will only create them if they don't already exist)
print("Building database tables...")
Base.metadata.create_all(bind=engine)

# 2. Initialize the main FastAPI application
app = FastAPI(
    title="Stellara AI Backend",
    description="The core API powering the Stellara platform.",
    version="3.0.0"
)

# 3. Configure CORS (Security setting to allow frontend connections)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change "*" to your actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers (like our JWT Authorization header)
)

# 4. Snap the Lego pieces (routers) onto the main app!
# The 'prefix' means all routes in auth.py will start with /api/auth (e.g., /api/auth/login)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["AI Chat"])
app.include_router(image.router, prefix="/api/vision", tags=["Computer Vision"])
app.include_router(payment.router, prefix="/api/payment", tags=["Payments"])

@app.get("/")
def root():
    return {"message": "Stellara Backend is officially online and listening!"}