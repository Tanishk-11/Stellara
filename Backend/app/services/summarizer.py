"""
summarizer.py
-------------
History summarization middleware for Stargazer.

Instead of injecting raw chat history into the agent (which grows without bound),
this module compresses past conversations into a short, fixed-size summary using a
fast, lightweight LLM call.

Token budget per call:
  - Summary output  : max ~150 tokens  (enforced by max_tokens on the LLM)
  - Summarizer input: last 20 raw pairs from the DB (capped in chat.py)

The main agent (agent.py) then only ever receives:
  [system: persona] + [system: ~150 token summary] + [current user message]
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

load_dotenv()

# ──────────────────────────────────────────────
# Use a fast, cheap model just for summarisation.
# llama-3.1-8b-instant is tiny and costs virtually
# nothing compared to gpt-oss-120b.
# ──────────────────────────────────────────────
_summarizer_llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0,
    max_tokens=150,   # Hard cap: the summary MUST stay within 150 tokens.
)

_SUMMARIZER_PROMPT = """\
You are a conversation memory compressor. Read the chat history below between a user and Stargazer (an astronomy AI assistant) and produce a 2-3 sentence summary that captures:
- The main topics or questions the user asked about
- Any key facts established (e.g. user's location, constellation discussed, news topics)
- The overall tone of the conversation

Be extremely concise. Output ONLY the summary, no preamble.

Chat history:
{history}

Summary:"""


def summarize_history(formatted_chats: list) -> str:
    """
    Compress a list of (role, content) tuples into a short summary string.

    Args:
        formatted_chats: List of ("user"|"assistant", message_text) tuples,
                         in chronological order (oldest first).

    Returns:
        A compact summary string (~150 tokens), or an empty string if there
        is no history to summarize.
    """
    if not formatted_chats:
        return ""

    # Build a human-readable transcript from the tuples
    lines = []
    for role, content in formatted_chats:
        label = "User" if role == "user" else "Stargazer"
        # Truncate individual messages that are excessively long to keep the
        # summarizer input itself under control (max 300 chars per message).
        truncated = content[:300] + "..." if len(content) > 300 else content
        lines.append(f"{label}: {truncated}")

    history_text = "\n".join(lines)
    prompt = _SUMMARIZER_PROMPT.format(history=history_text)

    try:
        response = _summarizer_llm.invoke([HumanMessage(content=prompt)])
        return response.content.strip()
    except Exception as e:
        # Summarization is non-critical — if it fails, return empty string
        # so the agent call still goes through without any history context.
        print(f"[summarizer] Warning: summarization failed ({e}). Proceeding without history.")
        return ""
