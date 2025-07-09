# agent.py
import os
import re
from dotenv import load_dotenv
from openai import AsyncOpenAI
from agents import Agent, OpenAIChatCompletionsModel, Runner
from tools.book_info_tool import get_book_info_raw, get_book_info
# from tools.book_summary_tool import get_book_summary  # Remove or comment out if not present

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

client = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

book_recommendation_agent = Agent(
    name="BookRecommender",
    instructions="""
You're an expert book assistant. When a user gives you a genre + mood, suggest 3 quality books.
Just list titles + 1-line summaries. Real book details will be fetched by tools after your response.
""",
    model=OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)
)

book_summary_agent = Agent(
    name="BookSummarizer",
    instructions="""
You are a professional book summarizer. When given a book name, return a very short title, full detailed summary, and the moral or takeaway.
Don't include links or author. A tool will enrich it later.
""",
    model=OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)
)

async def run_books_agent(message: str, user_genre: str = None, user_mood: str = None):
    # If only genre or only mood is provided, prompt for the missing one
    if user_genre and not user_mood:
        return {"final_output": "What mood are you in? (e.g., Relaxing, Exciting, Thoughtful, Adventurous)"}
    if user_mood and not user_genre:
        return {"final_output": "What genre are you interested in? (e.g., Fiction, Mystery, Sci-Fi, Non-Fiction, Romance, Fantasy)"}

    result = await Runner.run(book_recommendation_agent, message)
    raw_output = result.final_output if hasattr(result, 'final_output') else str(result)
    book_titles = re.findall(r"\*([^*]+)\*", raw_output)
    if not book_titles:
        book_titles = re.findall(r"^[\d\-\*\u2022]\s*(.+)$", raw_output, re.MULTILINE)

    enriched_blocks = []
    for title in book_titles[:3]:
        books = get_book_info_raw(title.strip())
        for book_data in books:
            if "error" in book_data:
                continue
            # If no description, generate summary using LLM
            summary = book_data['description']
            if not summary or summary == "No description available.":
                # Use LLM to generate summary (synchronously for now)
                try:
                    from backend.agent import book_summary_agent
                    summary_prompt = f"Summarize the book '{book_data['title']}' by {book_data['author']}."
                    summary_result = await Runner.run(book_summary_agent, summary_prompt)
                    summary = summary_result.final_output if hasattr(summary_result, 'final_output') else str(summary_result)
                except Exception:
                    summary = "No summary available."
            block = f"""
---

### 📘 *{book_data['title']}*

![Cover]({book_data['thumbnail']})

**✍️ Author**: {book_data['author']}  
**⭐ Rating**: {book_data['rating']}  
**🏷️ Tag**: {book_data['tag']}

---

### 📝 Summary  
{summary}

---

### 🔗 Where to Buy or Read  
• [Amazon]({book_data['buy_links'][0]})  
• [ZLibrary]({book_data['buy_links'][1]})  
• [Goodreads]({book_data['buy_links'][2]})
"""
            enriched_blocks.append(block)

    return {"final_output": "\n".join(enriched_blocks) if enriched_blocks else raw_output}

async def run_summary_agent(message: str):
    result = await Runner.run(book_summary_agent, message)
    raw_output = result.final_output if hasattr(result, 'final_output') else str(result)

    title_match = re.search(r"Title\s*[:\-]?\s*(.*)", raw_output)
    author_match = re.search(r"Author\s*[:\-]?\s*(.*)", raw_output)
    summary_match = re.search(r"Summary\s*[:\-]?\s*(.*)", raw_output, re.DOTALL)
    moral_match = re.search(r"Moral\s*[:\-]?\s*(.*)", raw_output)

    title = title_match.group(1).strip() if title_match else message.strip()
    author = author_match.group(1).strip() if author_match else ""
    summary = summary_match.group(1).strip() if summary_match else raw_output
    moral = moral_match.group(1).strip() if moral_match else "No moral provided."

    def normalize(text):
        return re.sub(r'[^a-z0-9]', '', text.lower())
    user_title_norm = normalize(title)
    user_author_norm = normalize(author)
    book_info_list = get_book_info_raw(title)
    book_data = None
    if book_info_list and "error" not in book_info_list[0]:
        for b in book_info_list:
            if normalize(b['title']) == user_title_norm and (not author or normalize(b['author']) == user_author_norm):
                book_data = b
                break
        if not book_data:
            for b in book_info_list:
                if normalize(b['title']) == user_title_norm:
                    book_data = b
                    break
        if not book_data:
            book_data = book_info_list[0]
    if not book_data:
        return {"final_output": raw_output}

    final = f"""
---

### 📘 *{book_data['title']}*

![Cover]({book_data['thumbnail']})

**✍️ Author**: {book_data['author']}  
**⭐ Rating**: {book_data['rating']}  

---

### 📝 Summary  
{summary}

---

### 🌟 Moral  
{moral}

---

### 🔗 Where to Buy or Read  
• [Amazon]({book_data['buy_links'][0]})  
• [ZLibrary]({book_data['buy_links'][1]})  
• [Goodreads]({book_data['buy_links'][2]})
"""
    return {"final_output": final}
