# tools/book_summary_tool.py

from agents import function_tool

@function_tool
def get_book_summary(book_title: str) -> dict:
    """
    This is a fallback/dummy summary tool. Can be expanded to call external LLMs or APIs.
    Returns a structured summary + moral for testing and non-production fallback.
    """
    return {
        "title": book_title,
        "summary": f"The story of '{book_title}' explores deep emotional and psychological journeys through its main character(s), with layered themes of growth, conflict, and transformation.",
        "moral": "Resilience and empathy can overcome even the most challenging circumstances."
    }
