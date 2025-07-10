# tools/book_info_tool.py

import requests
import random
import urllib.parse
from agents import function_tool

def get_book_info_raw(book_title: str) -> list:
    """
    Fetches up to 3 book data using Google Books API and falls back to Open Library for poster images.
    Returns a list of dicts with title, author, description, rating, tag, thumbnail, buy_links, and isbn.
    """
    query = book_title.strip().replace(" ", "+")
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=3"
    response = requests.get(url)

    if response.status_code != 200:
        return [{"error": "Failed to fetch book data from Google Books API."}]

    data = response.json()
    if not data.get("items"):
        return [{"error": "No books found for the given title."}]

    books = []
    for item in data["items"][:3]:
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
        description = book_info.get("description", "").lower()
        published = book_info.get("publishedDate", "")
        tag = "Trending"
        if published and published[:4].isdigit() and int(published[:4]) < 2000:
            tag = "Classic"
        elif "underrated" in description or "hidden gem" in description:
            tag = "Hidden Gem"
        elif rating >= 4.7:
            tag = "Trending"
        # Extract ISBN if available
        isbn = None
        for iden in book_info.get("industryIdentifiers", []):
            if iden.get("type") in ["ISBN_13", "ISBN_10"]:
                isbn = iden.get("identifier")
                break
        # Always use search links for reliability
        title_for_url = urllib.parse.quote_plus(book_info.get('title', book_title))
        amazon_link = f"https://www.amazon.com/s?k={title_for_url}"
        goodreads_link = f"https://www.goodreads.com/search?q={title_for_url}"
        bookscape_link = f"https://www.bookscape.co/search?q={title_for_url}"
        books.append({
            "title": book_info.get("title", "N/A"),
            "author": ", ".join(book_info.get("authors", ["Unknown Author"])),
            "description": book_info.get("description", "No description available."),
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
    return books

get_book_info = function_tool(get_book_info_raw)
   
   # tools/book_summary_tool.py
