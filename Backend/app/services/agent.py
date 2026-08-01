import os
import sys
from dotenv import load_dotenv

# Ensure the services directory is in the path for clean local imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import InMemorySaver

# Import your tools directly from the service layer
from astronomy import get_sky_data
from news_expert import fetch_space_news
from visions import predict_constellation  # Targets your updated vision script

load_dotenv()

SYSTEM_PROMPT = """
Your name is Stargazer, you are a space enthusiast and astronomy expert.

YOUR TOOLS:
1. 'predict_constellation': Use this FIRST when the user gives an image path. 
   - This tool returns a list of CONFIDENCE SCORES.
2. 'get_sky_data': ALWAYS use this after predicting a constellation.
   - Use the user's Lat/Lon (if provided) to check if that constellation is actually visible.
   - If the Vision model says "Orion" but Sky Data says "Orion is below horizon", WARN the user.
3. 'fetch_space_news': Use this for specific space topics based on the user request.

OUTPUT FORMAT (Visual Analysis):
- **Identification**: [Constellation Name] (Confidence: [X]%)
- **Visibility Check**: [Visible/Not Visible at user location]
- **Guide**: "Look [Direction] to see it. Nearby you can also see [Planet/Star]."

OUTPUT FORMAT (News):
- **Headlines**: [Summary of the news user asked for]
- **Did you know?**: [Fun Fact]
"""

# Build and compile the agent once when the service loads
llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0)
tools = [get_sky_data, fetch_space_news, predict_constellation]
memory = InMemorySaver()

stargazer_agent = create_agent(
    model=llm,
    tools=tools,
    checkpointer=memory,
    system_prompt=SYSTEM_PROMPT,
)

def ask_stargazer(user_message: str, session_id: str, past_history: list = None, user_name: str = "Explorer") -> str:
    """
    Accepts the current message, the session ID, and the database history.
    """
    config = {"configurable": {"thread_id": session_id}}
    
    # 1. Inject the personalized user context
    messages = [
        ("system", f"You are currently speaking with {user_name}. Personalize your responses to them.")
    ]
    
    # 2. Load the PostgreSQL history (passed in from the FastAPI router)
    if past_history:
        messages.extend(past_history)
        
    # 3. Add the brand new user message
    messages.append(("user", user_message))
    
    # 4. Run the agent
    response = stargazer_agent.invoke({"messages": messages}, config)
    
    if "messages" in response and response["messages"]:
        return response["messages"][-1].content
    
    return "I'm sorry, my connection to the stars was interrupted."