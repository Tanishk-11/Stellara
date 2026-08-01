# agent_service/news_expert.py

import feedparser
from langchain.tools import tool

# Verified Space News RSS Feeds
RSS_SOURCES = {
    "NASA Breaking": "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    "Space.com": "https://www.space.com/feeds/all",
    "ScienceDaily (Space)": "https://www.sciencedaily.com/rss/space_time.xml",
}


@tool
def fetch_space_news(topic: str = "general"):
    """
    Fetches the latest space news headlines.
    Useful when the user asks for updates on a specific topic (e.g., 'Mars', 'NASA')
    or just wants general space news.
    """
    news_items = []
    print(f"News Expert: Scanning feeds for '{topic}'...")

    for source_name, url in RSS_SOURCES.items():
        try:
            # Parse the RSS Feed
            feed = feedparser.parse(url)

            # Look at the top 5 articles from each source
            for entry in feed.entries[:5]:
                title = entry.title
                summary = entry.summary if "summary" in entry else ""
                link = entry.link

                # FILTERING LOGIC:
                # If topic is "general", take everything.
                # If topic is specific (e.g., "Mars"), only take matching articles.
                if (
                    topic.lower() == "general"
                    or topic.lower() in title.lower()
                    or topic.lower() in summary.lower()
                ):
                    # Format for the LLM to read easily
                    item = f"SOURCE: {source_name}\nHEADLINE: {title}\nSUMMARY: {summary[:200]}...\nLINK: {link}\n"
                    news_items.append(item)

        except Exception as e:
            print(f"Could not fetch from {source_name}: {e}")
            continue

    # Return results to the Agent
    if not news_items:
        return f"No recent news found specifically regarding '{topic}'. Try asking for general news."

    # Limit to top 3 most relevant results to save tokens
    return "\n---\n".join(news_items[:3])


# --- TEST BLOCK ---
if __name__ == "__main__":
    # CORRECT WAY to test a LangChain Tool:
    # You must pass a dictionary matching the arguments.
    print(fetch_space_news.invoke({"topic": "Mars"}))
