# tools/book_info_tool.py

import requests
import random
import urllib.parse
from agents import function_tool

def get_book_info_raw(book_title: str, author: str = None) -> list:
    """
    Fetches up to 3 book data using Google Books API and falls back to Open Library for poster images.
    Returns a list of dicts with title, author, description, rating, tag, thumbnail, buy_links, and isbn.
    If author is provided, it is included in the search query for better accuracy.
    The best match (exact title+author) is always first in the returned list.
    """
    import re
    def normalize(text):
        return re.sub(r'[^a-z0-9]', '', text.lower())
    query = book_title.strip()
    if author:
        query += f"+inauthor:{author.strip()}"
    query = query.replace(" ", "+")
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=5"
    response = requests.get(url)

    if response.status_code != 200:
        return [{"error": "Failed to fetch book data from Google Books API."}]

    data = response.json()
    if not data.get("items"):
        return [{"error": "No books found for the given title."}]

    books = []
    for item in data["items"][:5]:
        book_info = item["volumeInfo"]
        image_links = book_info.get("imageLinks", {})
        google_thumbnail = (
            image_links.get("thumbnail") or
            image_links.get("smallThumbnail")
        )
        openlibrary_fallback = f"https://covers.openlibrary.org/b/title/{book_info.get('title', book_title).replace(' ', '%20')}-L.jpg"
        thumbnail = google_thumbnail if google_thumbnail else openlibrary_fallback
        rating = book_info.get("averageRating")
        if rating is None:
            rating = round(random.uniform(3.5, 5.0), 1)
        description = book_info.get("description", "No description available.")
        published = book_info.get("publishedDate", "")
        tag = "Trending"
        if published and published[:4].isdigit() and int(published[:4]) < 2000:
            tag = "Classic"
        elif "underrated" in description.lower() or "hidden gem" in description.lower():
            tag = "Hidden Gem"
        elif rating >= 4.7:
            tag = "Trending"
        isbn = None
        for iden in book_info.get("industryIdentifiers", []):
            if iden.get("type") in ["ISBN_13", "ISBN_10"]:
                isbn = iden.get("identifier")
                break
        title_for_url = urllib.parse.quote_plus(book_info.get('title', book_title))
        amazon_link = f"https://www.amazon.com/s?k={title_for_url}"
        goodreads_link = f"https://www.goodreads.com/search?q={title_for_url}"
        bookscape_link = f"https://www.bookscape.co/search?q={title_for_url}"
        books.append({
            "title": book_info.get("title", "N/A"),
            "author": ", ".join(book_info.get("authors", ["Unknown Author"])),
            "description": description,
            "rating": rating,
            "tag": tag,
            "thumbnail": thumbnail,
            "isbn": isbn,
            "buy_links": [
                amazon_link,
                goodreads_link,
                bookscape_link
            ]
        })
    # Reorder: exact title+author match first, then partial, then rest
    user_title = normalize(book_title)
    user_author = normalize(author) if author else None
    exact = []
    partial = []
    rest = []
    for b in books:
        b_title = normalize(b['title'])
        b_author = normalize(b['author'])
        if user_author and b_title == user_title and user_author in b_author:
            exact.append(b)
        elif b_title == user_title or (user_author and user_author in b_author):
            partial.append(b)
        else:
            rest.append(b)
    return exact + partial + rest

get_book_info = function_tool(get_book_info_raw)
   
   # tools/book_summary_tool.py
