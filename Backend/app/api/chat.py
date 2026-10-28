from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

# Internal imports
from app.core.database import SessionLocal
from app.core.models import ChatHistory, User
from app.core.security import get_current_user
from app.services.agent import ask_stargazer
from app.services.summarizer import summarize_history

# Pydantic schema to receive the text safely
from typing import Optional

class ChatRequest(BaseModel):
    msg: str
    lat: Optional[float] = None
    lon: Optional[float] = None

router = APIRouter()
def get_db():
    db = SessionLocal()
    try:
        yield db 
    finally:
        db.close()

@router.post("/chat")
def get_chat_data(request: ChatRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    # 1. Fetch the last 20 chat pairs as source material for the summarizer.
    # The summarizer will compress these into ~150 tokens before passing to the agent.
    MAX_HISTORY_PAIRS = 20
    chats = (
        db.query(ChatHistory)
        .filter(ChatHistory.user_id == current_user.id)
        .order_by(ChatHistory.id.desc())
        .limit(MAX_HISTORY_PAIRS)
        .all()
    )
    # Reverse to get chronological order (oldest first)
    chats = list(reversed(chats))

    # 2. Format the chats for LangChain
    formatted_chats = []
    for chat in chats:
        formatted_chats.append(("user", chat.user_msg))
        formatted_chats.append(("assistant", chat.agent_reply))
        
    # 3. Summarize the raw history into a compact, token-capped string (~150 tokens).
    #    This is the "middleware" step — the agent never sees raw history tuples.
    history_summary = summarize_history(formatted_chats)

    # 4. Add location context to the user message
    location_str = f" [My location: Lat {request.lat}, Lon {request.lon}]" if request.lat and request.lon else ""
    enriched_msg = request.msg + location_str

    # 5. Call the AI — only the summary + current message reach the model
    ai_response = ask_stargazer(
        user_message=enriched_msg,
        session_id=str(current_user.id),
        history_summary=history_summary,
        user_name=current_user.name
    )
    
    # 5. Save to Database
    new_chat = ChatHistory(user_id=current_user.id, user_msg=request.msg, agent_reply=ai_response)
    db.add(new_chat)
    db.commit()
    
    # 5. Return
    return {"message": ai_response}