# agent.py

import os
import re
import json
from dotenv import load_dotenv
from openai import AsyncOpenAI
from agents import Agent, OpenAIChatCompletionsModel, Runner
from tools.book_info_tool import get_book_info_raw # Import the raw function
from fastapi import Request

# --- Basic Setup ---
load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

# It's good practice to handle the case where the key is missing
if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")

client = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# --- Agent Models ---
# Use a single fast model for both routing and generation
router_model = OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)
worker_model = OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)

# --------------------------------------------------------------------------
# AGENT DEFINITIONS - THE CORE OF THE INTELLIGENCE
# --------------------------------------------------------------------------

# ✅ 1. The Master Router Agent — The Brains of the Operation
book_master_agent = Agent(
    name="BookMasterAgent",
    instructions="""
You are the master routing agent for a brilliant AI book assistant.
Your sole responsibility is to analyze the user's message and determine their intent.
You DO NOT answer the user's query directly. You MUST respond in a valid JSON format.

### User Intents
1.  **greeting**: The user is saying hello, goodbye, or a simple social pleasantry (including 'how are you?').
2.  **recommend_similar**: User wants book recommendations based on another book, author, or series.
3.  **recommend_genre_mood**: User wants recommendations based on a genre and/or mood.
4.  **summarize_book**: User is asking for a summary, plot, or story of a specific book.
5.  **get_details**: User has stated a book title and wants to know more about it (default for a plain book title).
6.  **chit_chat**: The query is about books in general but isn't a specific request.
7.  **clarification_response**: The user is responding to the AI's question (e.g., providing a missing mood or genre).

### JSON Output Format
You must extract the relevant information for each intent into a JSON object.

{
  "intent": "INTENT_NAME",
  "query": "extracted book title, author, or user's question",
  "genre": "extracted genre, if any",
  "mood": "extracted mood, if any",
  "confidence_score": "A score from 0.0 to 1.0 on how certain you are of the intent."
}

### Examples
# GREETING
- User: "hello" -> {"intent": "greeting", "confidence_score": 1.0}
- User: "hi there!" -> {"intent": "greeting", "confidence_score": 1.0}
- User: "how are you?" -> {"intent": "greeting", "confidence_score": 1.0}
- User: "goodbye" -> {"intent": "greeting", "confidence_score": 1.0}

# RECOMMEND_SIMILAR
- User: "Suggest me something like Harry Potter" -> {"intent": "recommend_similar", "query": "Harry Potter", "confidence_score": 1.0}
- User: "Books similar to The Hunger Games" -> {"intent": "recommend_similar", "query": "The Hunger Games", "confidence_score": 1.0}
- User: "I want something like Percy Jackson" -> {"intent": "recommend_similar", "query": "Percy Jackson", "confidence_score": 1.0}

# RECOMMEND_GENRE_MOOD
- User: "Suggest me top rated romance books" -> {"intent": "recommend_genre_mood", "genre": "romance", "mood": null, "confidence_score": 1.0}
- User: "I want a thoughtful sci-fi book" -> {"intent": "recommend_genre_mood", "genre": "sci-fi", "mood": "thoughtful", "confidence_score": 0.9}
- User: "Show me a relaxing fantasy novel" -> {"intent": "recommend_genre_mood", "genre": "fantasy", "mood": "relaxing", "confidence_score": 0.9}

# SUMMARIZE_BOOK
- User: "Summarize Pride and Prejudice" -> {"intent": "summarize_book", "query": "Pride and Prejudice", "confidence_score": 1.0}
- User: "Tell me the story of Dune" -> {"intent": "summarize_book", "query": "Dune", "confidence_score": 1.0}

# GET_DETAILS
- User: "Dune" -> {"intent": "get_details", "query": "Dune", "confidence_score": 0.85}
- User: "Game of Thrones" -> {"intent": "get_details", "query": "Game of Thrones", "confidence_score": 0.85}

# CHIT_CHAT
- User: "Do you like books?" -> {"intent": "chit_chat", "query": "Do you like books?", "confidence_score": 0.8}
- User: "What's your favorite genre?" -> {"intent": "chit_chat", "query": "What's your favorite genre?", "confidence_score": 0.8}

# CLARIFICATION_RESPONSE
- User: "adventurous" (in response to a question) -> {"intent": "clarification_response", "mood": "adventurous", "confidence_score": 0.8}
- User: "fantasy" (in response to a question) -> {"intent": "clarification_response", "genre": "fantasy", "confidence_score": 0.8}
""",
    model=router_model
)

# ✅ 2. Book Recommendation Agent — The Creative Matchmaker
book_recommendation_agent = Agent(
    name="BookRecommender",
    instructions="""
You are a world-class literary expert and an enthusiastic book matchmaker. Your passion is connecting people with books they'll love.
Your task is to provide book recommendations based on the user's request. You MUST provide 3 recommendations.

### Output Format
- You MUST return a list of recommendations using '::' as a separator.
- DO NOT add any conversational text, greetings, or explanations.
- Format: `Book Title :: Reason for recommendation`

### Behavior & Quality
- **For 'Similar To' requests:** For each book, you MUST provide a clear explanation of why you are suggesting it, focusing on the similarities (theme, tone, plot, characters, or style) to the user's reference book. The explanation is required for every recommendation.
- **For 'Genre + Mood' requests:** The reason should be a compelling 1-line summary that fits the mood.
- Recommend real, well-regarded books. Be specific and insightful.

### Example Request 1
Suggest books similar to Harry Potter
### Example Output 1
Percy Jackson & the Olympians :: Follows a young boy who discovers he is part of a hidden magical world, attends a special camp for demigods, and faces epic quests with loyal friends—mirroring the coming-of-age, magical school, and friendship themes of Harry Potter.
The Magicians by Lev Grossman :: Features a secret school for magic, a group of close friends, and explores the darker, more adult consequences of wielding magical power, much like the later Harry Potter books.
Nevermoor: The Trials of Morrigan Crow :: Centers on a young protagonist who enters a magical society and must prove herself through a series of trials, echoing the magical world-building and underdog story of Harry Potter.

### Example Request 2
Suggest books similar to The Hunger Games
### Example Output 2
Divergent :: Set in a dystopian society where young people must make life-altering choices, featuring a strong female lead who challenges the system—paralleling the themes of rebellion and survival in The Hunger Games.
Legend by Marie Lu :: Follows two teens from different backgrounds in a militarized, oppressive society, both fighting for justice and survival, similar to the dual perspectives and high-stakes world of The Hunger Games.
Red Queen by Victoria Aveyard :: Features a divided society, a young heroine with hidden powers, and a fight against tyranny, closely matching the social structure and resistance themes of The Hunger Games.
""",
    model=worker_model
)

# ✅ 3. Book Summary Agent — The Master Storyteller
book_summary_agent = Agent(
    name="BookSummarizer",
    instructions="""
You are a master storyteller and literary analyst.
Your task is to provide a comprehensive, spoiler-aware summary and a profound moral takeaway for a given book.

### Output Format
- You MUST use the following format with keys in all caps, followed by '::'.
- Do not include any other text, greetings, or formatting.

TITLE:: [The official, full title of the book]
SUMMARY:: [A detailed, 2-paragraph summary. It should cover the main plot points, characters, and setting, but avoid spoiling major twists or the ending.]
MORAL:: [A single, insightful sentence capturing the key moral, theme, or philosophical takeaway of the book.]

### Example Request
"Summarize 'To Kill a Mockingbird'"
### Example Output
TITLE:: To Kill a Mockingbird
SUMMARY:: Set in the racially charged town of Maycomb, Alabama, during the Great Depression, the story is told through the eyes of a young girl named Scout Finch...[full summary]
MORAL:: True courage is not the absence of fear, but standing up for what is right even when you know you are likely to lose.
""",
    model=worker_model
)

# --- Session & Orchestration Logic ---
SESSION_STATE = {}

def get_session_id(req: Request, user_id: str = None):
    if user_id: return user_id
    if hasattr(req, 'user_id') and req.user_id: return req.user_id
    if hasattr(req, 'client') and req.client: return str(req.client.host)
    return 'global'

async def run_book_agent_orchestrator(message: str, request: Request, user_id: str = None):
    """The main orchestrator that routes user requests to the correct agent or function."""
    session_id = get_session_id(request, user_id)
    session_data = SESSION_STATE.get(session_id, {"genre": None, "mood": None})

    router_prompt = f'User Message: "{message}"\nCurrent Session State: {json.dumps(session_data)}'
    router_result = await Runner.run(book_master_agent, router_prompt)
    
    try:
        cleaned_output = re.sub(r'```json\s*|\s*```', '', router_result.final_output, flags=re.DOTALL).strip()
        intent_data = json.loads(cleaned_output)
        intent = intent_data.get("intent")
    except (json.JSONDecodeError, AttributeError, TypeError):
        # Fallback if the router fails catastrophically
        return {"final_output": "I'm sorry, I had a little trouble understanding that. Could you please rephrase?"}

    # Handle multi-turn conversation for genre/mood
    if intent == "recommend_genre_mood" or intent == "clarification_response":
        session_data["genre"] = intent_data.get("genre") or session_data.get("genre")
        session_data["mood"] = intent_data.get("mood") or session_data.get("mood")
        
        if session_data["genre"] and not session_data["mood"]:
            SESSION_STATE[session_id] = session_data
            return {"final_output": f"Sounds good, you're looking for a **{session_data['genre']}** book. What kind of mood are you in? (e.g., adventurous, thoughtful, relaxing)"}
        
        if not session_data["genre"] and session_data["mood"]:
            SESSION_STATE[session_id] = session_data
            return {"final_output": f"Got it, you want something **{session_data['mood']}**. What genre? (e.g., Sci-Fi, Fantasy, Mystery)"}
        
        if session_data["genre"] and session_data["mood"]:
            query = f"A {session_data['mood']} {session_data['genre']} book"
            SESSION_STATE[session_id] = {"genre": None, "mood": None}  # Clear state after use
            return await _handle_recommendations(query, is_similar=False)
        else:
             SESSION_STATE[session_id] = session_data
             return {"final_output": "To give you the best recommendations, I need a genre (like Sci-Fi) and a mood (like Adventurous). What are you looking for?"}

    # Route to the correct worker based on intent
    if intent == "greeting":
        return {"final_output": "Yes, I'm fine. How can I help you?"}
    elif intent == "recommend_similar":
        query = intent_data.get("query", message)
        return await _handle_recommendations(f"Books similar to {query}", is_similar=True)
    elif intent == "summarize_book":
        query = intent_data.get("query", message)
        return await _handle_summary(query)
    elif intent == "get_details":
        query = intent_data.get("query", message)
        return await _handle_details(query)
    elif intent == "chit_chat":
        query = intent_data.get("query", message)
        generic_response = await Runner.run(book_recommendation_agent, f"The user is making small talk: '{query}'. Respond conversationally in your persona as a book lover.")
        return {"final_output": generic_response.final_output}
    else:
        return {"final_output": "I can help with book recommendations and summaries. What would you like to know?"}

# --- Helper Handlers for different intents ---

async def _handle_recommendations(prompt: str, is_similar: bool):
    """Calls the recommendation agent and enriches the results."""
    # If this is a 'similar' request, force the LLM to explain similarities for each book
    if is_similar:
        prompt = (
            prompt.strip() +
            ". Recommend 3 books and for each, explain in detail why it is similar to the reference (theme, tone, plot, characters, or style). The explanation is required for every recommendation."
        )
    worker_result = await Runner.run(book_recommendation_agent, prompt)
    enriched_blocks = []
    matches = re.findall(r"^(.*?)\s*::\s*(.*)", worker_result.final_output, re.MULTILINE)
    
    for title, reason in matches:
        block = await _format_book_block(title.strip(), reason=reason.strip(), is_similar=is_similar)
        if block:
            enriched_blocks.append(block)

    return {"final_output": "\n".join(enriched_blocks) or "I couldn't find specific recommendations for that, please try another request!"}

async def _handle_summary(query: str):
    """Calls the summary agent and enriches the result."""
    worker_result = await Runner.run(book_summary_agent, query)
    try:
        title = re.search(r"TITLE::\s*(.*)", worker_result.final_output).group(1).strip()
        summary = re.search(r"SUMMARY::\s*(.*)", worker_result.final_output, re.DOTALL).group(1).strip()
        moral = re.search(r"MORAL::\s*(.*)", worker_result.final_output).group(1).strip()
    except AttributeError:
        return {"final_output": worker_result.final_output} # Fallback if LLM fails format

    block = await _format_book_block(title, summary=summary, moral=moral)
    return {"final_output": block or worker_result.final_output}

async def _handle_details(query: str):
    """Handles a direct request for book details."""
    block = await _format_book_block(query)
    return {"final_output": block or f"Sorry, I couldn't find any details for '{query}'."}

async def _format_book_block(title: str, author: str = None, reason: str = None, summary: str = None, moral: str = None, is_similar: bool = False) -> str | None:
    """A generic helper to fetch book info and format a beautiful Markdown block."""
    books_data = get_book_info_raw(title, author)
    if not books_data:
        return None  # The refined tool returns [] on failure, so this check is clean and sufficient.

    # The refined tool returns the best match first, so we can confidently use index 0.
    book = books_data[0]

    final_summary = summary or book.get('description', 'No summary available.')
    
    block = f"""---
### 📘 *{book['title']}*
![Cover]({book['thumbnail']})
**✍️ Author**: {book['author']}  
**⭐ Rating**: {book['rating']}  
**🏷️ Tag**: {book['tag']}
---"""
    
    if reason:
        reason_header = "🤝 Why It’s Similar" if is_similar else "📖 What It’s About"
        block += f"\n### {reason_header}\n{reason}\n\n---"
    
    if final_summary:
        block += f"\n### 📝 Summary\n{final_summary}\n\n---"

    if moral:
        block += f"\n### 🌟 Moral / Takeaway\n{moral}\n\n---"

    block += f"""
### 🔗 Where to Buy or Read
• [Amazon]({book['buy_links'][0]})  
• [Goodreads]({book['buy_links'][1]})  
• [Bookscape]({book['buy_links'][2]})"""

    return block