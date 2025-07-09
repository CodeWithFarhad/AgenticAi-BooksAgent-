# tools.py
# Placeholder for book search, summary, and recommendation tools 

import os
import httpx
from dotenv import load_dotenv
from agents import function_tool
import random
from datetime import datetime
import requests

load_dotenv()
GOOGLE_API_KEY = "AIzaSyD7IfsoOynpHja5DJmKCGrmqv4JHeUCRxM"

async def search_books(query: str):
    """Search for books using Google Books API."""
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&key={GOOGLE_API_KEY}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        return resp.json()

async def get_book_details(volume_id: str):
    """Get detailed info for a book by volume ID."""
    url = f"https://www.googleapis.com/books/v1/volumes/{volume_id}?key={GOOGLE_API_KEY}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        return resp.json()

async def generate_summary(text: str):
    """Generate a structured summary using Gemini LLM via the OpenAI-compatible client."""
    print("generate_summary called with text:", text)
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=os.getenv('GEMINI_API_KEY'),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )

    prompt = (
        "Generate a comprehensive but concise summary of the following text. "
        "Structure the summary in the following format:\n"
        "1. Main Plot/Theme (2-3 sentences)\n"
        "2. Key Points (3-4 bullet points)\n"
        "3. Writing Style & Tone\n"
        "4. Target Audience\n"
        "5. Reading Time & Complexity\n\n"
        "Text to summarize:\n"
        f"{text}"
    )
    
    try:
        response = await client.chat.completions.create(
            model="models/gemini-1.5-pro-latest",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        summary = response.choices[0].message.content
        
        # Add metadata
        return {
            "summary": summary,
            "generated_at": datetime.now().isoformat(),
            "word_count": len(text.split()),
            "estimated_reading_time": f"{len(text.split()) // 200} minutes",
            "success": True
        }
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return {
            "error": "Failed to generate summary",
            "message": str(e),
            "success": False
        }

async def recommend_books(prefs: dict):
    """Recommend books based on user preferences using Google Books API and additional sources."""
    genres = prefs.get("genres", [])
    mood = prefs.get("mood", "").lower()
    reading_level = prefs.get("readingLevel", "").lower()
    mode = prefs.get("mode", "discovery").lower()
    
    query_parts = []
    if genres:
        query_parts.append("+".join(genres))
    if mood:
        query_parts.append(mood)
    if reading_level:
        query_parts.append(reading_level)
    
    # Adjust query based on mode
    mode_keywords = {
        "discovery": ["new releases", "trending"],
        "comfort": ["bestseller", "highly rated"],
        "challenge": ["complex", "thought-provoking"],
        "learning": ["educational", "instructional"],
        "mood": [mood] if mood else ["feel-good"],
        "time-sensitive": ["quick read", "short"]
    }
    if mode in mode_keywords:
        query_parts.extend(mode_keywords[mode])
    
    query = "+".join(query_parts) if query_parts else "books"
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=20&key={GOOGLE_API_KEY}"
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        data = resp.json()
        items = data.get("items", [])
        random.shuffle(items)
        recommendations = []
        
        for item in items[:5]:
            volume_info = item.get("volumeInfo", {})
            book_genres = [g.lower() for g in volume_info.get("categories", [])]
            book_title = (volume_info.get("title") or "").lower()
            book_desc = (volume_info.get("description") or "").lower()
            
            # Calculate match score
            genre_score = sum(1 for g in genres if g.lower() in book_genres)
            mood_score = 1 if mood and mood in book_title + book_desc else 0
            reading_score = 1 if reading_level and reading_level in book_desc else 0
            mode_score = sum(1 for kw in mode_keywords.get(mode, []) if kw.lower() in book_desc)
            
            total_score = (
                genre_score * 40 +
                mood_score * 20 +
                reading_score * 20 +
                mode_score * 20
            )
            matchScore = min(100, total_score) if (genre_score or mood_score or reading_score or mode_score) else random.randint(60, 80)
            
            # Calculate estimated reading time
            page_count = volume_info.get("pageCount", 0)
            reading_time = f"{page_count // 30} hours" if page_count else "Unknown"
            
            # Get purchase/read links
            isbn = volume_info.get("industryIdentifiers", [{}])[0].get("identifier", "")
            purchase_links = {
                "Google Books": f"https://books.google.com/books?id={item.get('id')}",
                "Amazon": f"https://www.amazon.com/s?k={volume_info.get('title')}+{'+'.join(volume_info.get('authors', []))}",
                "Goodreads": f"https://www.goodreads.com/search?q={volume_info.get('title')}",
                "WorldCat": f"https://www.worldcat.org/search?q={volume_info.get('title')}"
            }
            
            recommendations.append({
                "id": item.get("id"),
                "title": volume_info.get("title"),
                "author": ", ".join(volume_info.get("authors", [])),
                "genre": ", ".join(volume_info.get("categories", [])),
                "rating": volume_info.get("averageRating", None),
                "ratingsCount": volume_info.get("ratingsCount", 0),
                "pages": volume_info.get("pageCount", None),
                "description": volume_info.get("description", ""),
                "coverUrl": volume_info.get("imageLinks", {}).get("thumbnail", ""),
                "publishedDate": volume_info.get("publishedDate", ""),
                "matchScore": matchScore,
                "readingTime": reading_time,
                "purchaseLinks": purchase_links,
                "isbn": isbn,
                "previewLink": volume_info.get("previewLink", ""),
                "date": datetime.now().isoformat(),
            })
        
        return {"recommendations": recommendations}

@function_tool
async def search_books_tool(query: str) -> dict:
    return await search_books(query)

@function_tool
async def generate_summary_tool(text: str) -> dict:
    return await generate_summary(text)

@function_tool
def fetch_books_from_google(query: str) -> list:
    """
    Fetch real books with cover images and metadata from Google Books API.
    """
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=5"
    response = requests.get(url)

    if response.status_code != 200:
        return [{"error": "Failed to fetch books"}]

    items = response.json().get("items", [])

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