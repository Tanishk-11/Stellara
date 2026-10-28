from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Safe fallback if DATABASE_URL is not set in current environment
    DATABASE_URL = "sqlite:///./stellara.db"

# Cloud platforms like Render, Heroku, etc. provide 'postgres://' which
# modern SQLAlchemy does not support. Convert to 'postgresql://'.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure connection arguments (e.g. check_same_thread for SQLite)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping=True tests connections prior to use to survive cloud dropped connections
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autoflush=False, autocommit=False, bind=engine)

Base = declarative_base()

# Engine -> manages the connection to the database.
# Session -> performs database operations using that connection.
# Base -> the foundation from which all ORM table classes are defined.
