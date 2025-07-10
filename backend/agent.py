import os
import re
from dotenv import load_dotenv
from openai import AsyncOpenAI
from agents import Agent, OpenAIChatCompletionsModel, Runner
from tools.book_info_tool import get_book_info_raw, get_book_info

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

client = AsyncOpenAI(
    api_key=gemini_api_key,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

# ✅ Book Recommendation Agent — Supports Genre+Mood & "Like X" queries
book_recommendation_agent = Agent(
    name="BookRecommender",
    instructions="""
You are an expert book assistant and literary matchmaker. You recommend books based on:
- User genre + mood
- Similarity to specific books or authors
- Specific themes, tones, or interests (e.g., "space opera", "books with strong female leads", "grief", "found family")

---

### 🔹 Mode 1: Genre + Mood Recommendation

**When the user provides a genre and a mood**, respond with 3 book suggestions.

**For each book:**
- Title (in *italics* or **bold**)
- A short 1-line summary of what it's about

---

### 🔹 Mode 2: Books Similar to a Given Book or Author

**When the user mentions a known book, series, or author (e.g., 'like Harry Potter', 'similar to Dan Brown'),** give 2–3 books that are similar in content, style, theme, or tone.

**For each recommended book, include:**
- The book title
- A 1–2 sentence explanation of **why it's similar**

---

### 🔹 Behavior & Quality Guidelines

- Only recommend real, known titles
- Avoid repeating the original book
- Avoid generic responses; be specific
- Do not include author, year, links, or formatting
- Tools will enrich your answer with details

---

### 🔹 Examples

**Prompt:** “Books like *The Hunger Games*”  
Response:  
- *Divergent* — Features a dystopian society with rebellious youth fighting a strict regime.  
- *Legend* — Similar themes of surveillance, resistance, and two young protagonists from opposite worlds.  
- *Red Queen* — Combines royalty, rebellion, and a female protagonist discovering her powers.
"""
,
    model=OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)
)

# ✅ Book Summary Agent — Gives clean summary and moral
book_summary_agent = Agent(
    name="BookSummarizer",
    instructions="""
You are a professional literary analyst.

When given a book title, return:

1. A short title or alias of the book
2. A full, detailed, spoiler-aware summary of the book (1–2 paragraphs)
3. A key moral or philosophical takeaway (1 sentence)

❗ Don't include:
- Author name
- Year of publication
- Genre
- Book links or images
- Any markdown or formatting

Tools will enrich the final output with covers, authors, ratings, and links.

Examples of prompts:
- "Summarize The Alchemist"
- "Tell me the story of Harry Potter and the Chamber of Secrets"
"""
,
    model=OpenAIChatCompletionsModel(model="gemini-2.0-flash", openai_client=client)
)

# ✅ Main Book Recommendation Handler
async def run_books_agent(message: str, user_genre: str = None, user_mood: str = None):
    if user_genre and not user_mood:
        return {"final_output": "What mood are you in? (e.g., Relaxing, Exciting, Thoughtful, Adventurous)"}
    if user_mood and not user_genre:
        return {"final_output": "What genre are you interested in? (e.g., Fiction, Mystery, Sci-Fi, Non-Fiction, Romance, Fantasy)"}

    result = await Runner.run(book_recommendation_agent, message)
    raw_output = result.final_output if hasattr(result, 'final_output') else str(result)

    # Parse book title + reason or summary
    matches = re.findall(r"[*•\-]?\s*[\d]*[.)]?\s*\*?([^\*\n]+?)\*?\s*[\:\-–—]\s*(.+)", raw_output)
    if not matches:
        matches = re.findall(r"[*•\-]?\s*[\d]*[.)]?\s*(.*?)\s*[\:\-–—]\s*(.+)", raw_output)

    enriched_blocks = []
    for title, reason in matches[:3]:
        books = get_book_info_raw(title.strip())
        for book_data in books:
            if "error" in book_data:
                continue
            summary = book_data['description']
            if not summary or summary == "No description available.":
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

### 🤝 Why It’s Similar / What It’s About  
{reason}

---

### 📝 Summary  
{summary}

---

### 🔗 Where to Buy or Read  
• [Amazon]({book_data['buy_links'][0]})
"""
            enriched_blocks.append(block)

    return {"final_output": "\n".join(enriched_blocks) if enriched_blocks else raw_output}

# ✅ Book Summary Handler
async def run_summary_agent(message: str):
    result = await Runner.run(book_summary_agent, message)
    raw_output = result.final_output if hasattr(result, 'final_output') else str(result)

    title_match = re.search(r"(Title|Book)\s*[:\-]?\s*(.*)", raw_output, re.IGNORECASE)
    summary_match = re.search(r"(Summary)\s*[:\-]?\s*(.*?)(?:Moral|$)", raw_output, re.DOTALL | re.IGNORECASE)
    moral_match = re.search(r"(Moral|Takeaway)\s*[:\-]?\s*(.*)", raw_output, re.IGNORECASE)

    title_from_llm = title_match.group(2).strip() if title_match else message.strip()
    summary = summary_match.group(2).strip() if summary_match else raw_output
    moral = moral_match.group(2).strip() if moral_match else "No moral provided."

    book_info_list = get_book_info_raw(message)
    if not book_info_list or "error" in book_info_list[0]:
        return {"final_output": raw_output}

    def normalize(text):
        return re.sub(r'[^a-z0-9]', '', text.lower())

    user_input_norm = normalize(message)
    best_match = None
    for b in book_info_list:
        if normalize(b['title']) in user_input_norm or user_input_norm in normalize(b['title']):
            best_match = b
            break
    if not best_match:
        best_match = book_info_list[0]

    final = f"""
---

### 📘 *{best_match['title']}*

![Cover]({best_match['thumbnail']})

**✍️ Author**: {best_match['author']}  
**⭐ Rating**: {best_match['rating']}  

---

### 📝 Summary  
{summary}

---

### 🌟 Moral  
{moral}

---

### 🔗 Where to Buy or Read  
• [Amazon]({best_match['buy_links'][0]})
"""
    return {"final_output": final}
