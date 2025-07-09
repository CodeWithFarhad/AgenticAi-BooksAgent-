# tools/book_summary_tool.py

from agents import function_tool

@function_tool
def get_book_summary(book_title: str) -> dict:
    """
    (Optional Tool) Returns a dummy summary and moral for fallback or testing.
    Can be expanded to call external APIs if needed.
    """
    # Static return for now; real logic could be added
    return {
        "title": book_title,
        "summary": f"This is a sample summary of the book '{book_title}'. It discusses the themes, characters, and key messages.",
        "moral": "Stay strong through adversity and value personal growth."
    }
