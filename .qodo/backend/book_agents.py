from openai import AsyncOpenAI
from agents import Agent, OpenAIChatCompletionsModel, Runner
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import httpx

load_dotenv()

client = AsyncOpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# --- Output Types ---
class BookRoutingDecision(BaseModel):
    route: str  # 'recommendation' or 'summary'
    query: str  # cleaned-up user query

class BookRecommendation(BaseModel):
    recommendations: list

class BookSummary(BaseModel):
    summary: str

# --- Agents ---
book_router_agent = Agent(
    name="BookRouterAgent",
    instructions="""
You are a book assistant router. Read the user's message and classify it as one of:
- 'recommendation' (for book suggestions, genres, moods, discovery, etc.)
- 'summary' (for requests to summarize or analyze a specific book)

Return a JSON with:
- route: one of 'recommendation', 'summary'
- query: a cleaned-up version of the user's query for the downstream agent.
If ambiguous, default to 'recommendation'.
""",
    output_type=BookRoutingDecision,
    model=OpenAIChatCompletionsModel(model="models/gemini-1.5-flash-latest", openai_client=client),
)

def search_books_google(query: str):
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=5"
    resp = httpx.get(url)
    if resp.status_code != 200:
        return []
    items = resp.json().get("items", [])
    results = []
    for item in items:
        info = item.get("volumeInfo", {})
        results.append({
            "id": item.get("id"),
            "title": info.get("title", "Unknown"),
            "authors": info.get("authors", []),
            "description": info.get("description", "")[:200],
            "thumbnail": info.get("imageLinks", {}).get("thumbnail", ""),
            "info_link": info.get("infoLink", "")
        })
    return results

book_recommendation_agent = Agent(
    name="BookRecommendationAgent",
    instructions="""
You are a book recommendation expert. Given a user query, provide 3-5 highly relevant book recommendations. Always use real data from the Google Books API (use the provided search_books_google function). Format your output as a Markdown list with title, author, and a short description. Never hallucinate books.
""",
    model=OpenAIChatCompletionsModel(model="models/gemini-1.5-flash-latest", openai_client=client),
    tools={"search_books_google": search_books_google},
)

book_summary_agent = Agent(
    name="BookSummaryAgent",
    instructions="""
You are a world-class literary analyst. Given a book title, generate a detailed, structured summary. Structure your summary as:
1. Main Plot/Theme (2-3 sentences)
2. Key Points (3-4 bullet points)
3. Writing Style & Tone
4. Target Audience
5. Reading Time & Complexity
If you cannot find information, say so politely. Never recommend other books in this response.
""",
    model=OpenAIChatCompletionsModel(model="models/gemini-1.5-flash-latest", openai_client=client),
)

# --- Runner Logic ---
class BookAgentRunner:
    @staticmethod
    def run_sync(user_input: str):
        route_result = Runner.run_sync(book_router_agent, user_input)
        decision = route_result.final_output
        if decision.route == "recommendation":
            reply = Runner.run_sync(book_recommendation_agent, decision.query)
        elif decision.route == "summary":
            reply = Runner.run_sync(book_summary_agent, decision.query)
        else:
            return "❌ Unknown route."
        return reply.final_output

    @staticmethod
    async def run_streamed(user_input: str):
        route_result = await book_router_agent.arun(user_input)
        decision = route_result.final_output
        if decision.route == "recommendation":
            agent = book_recommendation_agent
        elif decision.route == "summary":
            agent = book_summary_agent
        else:
            yield "❌ Unknown route."
            return
        # Stream the response from the selected agent
        async for chunk in agent.astream(decision.query):
            yield chunk

# For FastAPI integration

def get_agent():
    return BookAgentRunner 