# Stellara

Stellara
An AI-powered Software-as-a-Service (SaaS) platform for real-time space news and constellation finding for amateur astronomers and stargazers. It bridges the gap between raw machine learning and computational astrophysics by identifying constellations and validating them deterministically against live physical sky data.  

Core Features
Physics-Informed Vision: Fuses an EfficientNetV2B0 vision model, achieving 96.37% accuracy, with live GPS telemetry and NASA JPL ephemeris data via Skyfield. This deterministic validation eliminates AI hallucinations by verifying that the predicted celestial body is physically visible above the user's local horizon.  

High-Fidelity Synthetic Training: Overcomes astronomical data scarcity using a custom, balanced dataset of over 800 images generated via Stellarium simulations. The pipeline models diverse atmospheric conditions, light pollution, and sensor angles to optimize real-world generalization across 8 target constellations.  

Agentic Orchestration: A LangChain/LangGraph-based "Stargazer" master agent dynamically routes tasks between the vision classifier, the physics validator, and real-time space news RSS feeds from NASA, Space.com, and ScienceDaily.

Secure SaaS Architecture: Implements stateless JWT authentication, Bcrypt password hashing, and a normalized PostgreSQL relational database schema to strictly maintain data integrity and securely persist user credentials and chat histories.  
PDF

Premium Tier Integration: Features an automated, webhook-verified payment pipeline via Stripe and Razorpay. Premium subscription access unlocks persistent Cloudinary image storage and personalized data histories.

Tech Stack
AI & Machine Learning: TensorFlow/Keras (TFLite edge deployment), LangChain, LangGraph, OpenAI, Groq APIs.  

Backend: Python, FastAPI, SQLAlchemy, Skyfield.  

Frontend: React.js, Tailwind CSS, HTML5 Geolocation.

Database & Storage: PostgreSQL, Cloudinary.  

DevOps: Docker, GitHub Actions, Render.  

System Architecture
Client Layer: A React-based, sci-fi-themed dashboard captures sky imagery and user GPS coordinates, submitting them securely to the backend via POST requests.

API Gateway: FastAPI receives incoming HTTP requests and enforces JWT-based route protection.

The "Eyes" (Vision Engine): The uploaded image is evaluated by the EfficientNetV2B0 model to generate a dictionary of confidence scores across the target constellations.

The "Navigator" (Physics Engine): The Skyfield module calculates the apparent altitude and azimuth of the predicted constellation using the user's coordinates and a live timestamp.

The "Brain" (Master Agent): The central LangChain orchestrator synthesizes the vision confidence scores, physical horizon validation, and live RSS news into a final, physics-validated intelligence report.
