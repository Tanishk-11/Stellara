from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL= os.getenv("DATABASE_URL")
engine= create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autoflush=False,autocommit=False,bind=engine)

Base = declarative_base()

# Engine → manages the connection to the database.
# Session → performs database operations using that connection.
# Base → the foundation from which all ORM table classes are defined.