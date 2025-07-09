import json
import traceback
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import uuid4
import os


import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Query, Body, HTTPException, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Float
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv
import httpx
from collections import defaultdict
from book_agents import get_agent

# --- Environment and Configuration ---
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "a_secure_development_secret_key")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bookagent_pro.db")

# --- Client and App Initialization ---
client = AsyncOpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
)
app = FastAPI(
    title="BookAgent Pro",
    version="3.0.0",
    description="A professional, context-aware AI agent for book recommendations and analysis."
)

api_router = APIRouter(prefix="/api")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://bookagent.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup ---
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class BookHistory(Base):
    __tablename__ = "book_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    book_id = Column(String, nullable=False)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    cover_url = Column(Text, nullable=True)
    status = Column(String, default="want_to_read") # e.g., 'want_to_read', 'reading', 'read'
    added_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# --- Pydantic Schemas ---
class ChatRequest(BaseModel):
    messages: List[dict]
    token: Optional[str] = None # Token can be sent in the body
    max_recommendations: int = Field(5, gt=0, le=10)

class BookAddRequest(BaseModel):
    book_id: str
    title: str
    author: str
    cover_url: Optional[str] = None
    status: str = "want_to_read"

class UserCreate(BaseModel):
    firstName: str
    lastName: str
    email: str
    password: str

class UserSignIn(BaseModel):
    email: str
    password: str

# --- Dependencies ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Query(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# New dependency for optional authentication in the chat endpoint
async def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    # Try to get token from header first (standard), then from body (our custom case)
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    
    if not token:
        try:
            body = await request.json()
            token = body.get("token")
        except Exception:
            # No body or invalid JSON, no token.
            return None

    if not token:
        return None
    
    try:
        # Re-use the logic from get_current_user but don't raise HTTPExceptions
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = db.query(User).filter(User.id == payload.get("user_id")).first()
        return user
    except (jwt.PyJWTError, jwt.ExpiredSignatureError):
        return None # Invalid or expired token is treated as an anonymous user

# --- API Endpoints ---
@api_router.post("/signup")
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(name=f"{user.firstName} {user.lastName}", email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = jwt.encode(
        {"user_id": new_user.id, "exp": datetime.utcnow() + timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256"
    )
    return {"id": new_user.id, "email": new_user.email, "name": new_user.name, "token": token}

@api_router.post("/signin")
async def signin(user: UserSignIn, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not bcrypt.checkpw(user.password.encode("utf-8"), db_user.hashed_password.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode(
        {"user_id": db_user.id, "exp": datetime.utcnow() + timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256"
    )
    return {"id": db_user.id, "email": db_user.email, "name": db_user.name, "token": token}

@api_router.post("/add-to-list")
async def add_book(book: BookAddRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    book_entry = BookHistory(
        user_id=user.id,
        book_id=book.book_id,
        title=book.title,
        author=book.author,
        cover_url=book.cover_url,
        status=book.status,
    )
    db.add(book_entry)
    db.commit()
    db.refresh(book_entry)
    return {"message": "Book added successfully", "book": book_entry.id}

@api_router.get("/my-books")
async def get_user_books(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(BookHistory).filter(BookHistory.user_id == user.id).order_by(BookHistory.updated_at.desc()).all()

@api_router.get("/search-books")
async def search_books_endpoint(query: str = ""):
    if not query.strip():
        query = "bestsellers"
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=10"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        data = resp.json()
        items = []
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            items.append({
                "id": item.get("id"),
                "volumeInfo": {
                    "title": info.get("title", "Unknown"),
                    "authors": info.get("authors", ["Unknown"]),
                    "imageLinks": {"thumbnail": info.get("imageLinks", {}).get("thumbnail", "")},
                    "description": info.get("description", "")[:300],
                    "categories": info.get("categories", []),
                    "averageRating": info.get("averageRating", 0),
                    "publishedDate": info.get("publishedDate", ""),
                }
            })
        return {"items": items}

# In-memory anonymous history store (for demo only, not production safe)
anonymous_history = defaultdict(list)

@api_router.get("/history")
async def get_history(request: Request, db: Session = Depends(get_db), user: Optional[User] = Depends(get_optional_current_user)):
    if user:
        books = db.query(BookHistory).filter(BookHistory.user_id == user.id).order_by(BookHistory.updated_at.desc()).all()
        return {"books": [
            {"id": b.id, "title": b.title, "author": b.author, "cover": b.cover_url, "status": b.status, "sourceId": b.book_id} for b in books
        ]}
    # Anonymous user: use session or IP as key
    anon_id = request.client.host
    return {"books": anonymous_history[anon_id]}

@api_router.post("/history")
async def add_history(book: dict = Body(...), request: Request = None, db: Session = Depends(get_db), user: Optional[User] = Depends(get_optional_current_user)):
    if user:
        book_entry = BookHistory(
            user_id=user.id,
            book_id=book.get("sourceId", ""),
            title=book.get("title", ""),
            author=book.get("author", ""),
            cover_url=book.get("cover", ""),
            status=book.get("status", "want_to_read"),
        )
        db.add(book_entry)
        db.commit()
        db.refresh(book_entry)
        return {"message": "Book added to history", "id": book_entry.id}
    # Anonymous user: store in memory
    anon_id = request.client.host
    # Generate a fake id for the book
    book_id = str(uuid4())
    anon_book = {
        "id": book_id,
        "title": book.get("title", ""),
        "author": book.get("author", ""),
        "cover": book.get("cover", ""),
        "status": book.get("status", "want_to_read"),
        "sourceId": book.get("sourceId", ""),
    }
    anonymous_history[anon_id].insert(0, anon_book)
    return {"message": "Book added to history (anonymous)", "id": book_id}

@api_router.delete("/history/{book_id}")
async def delete_history(book_id: str, request: Request, db: Session = Depends(get_db), user: Optional[User] = Depends(get_optional_current_user)):
    if user:
        book = db.query(BookHistory).filter(BookHistory.id == book_id, BookHistory.user_id == user.id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        db.delete(book)
        db.commit()
        return {"message": "Book deleted from history"}
    # Anonymous user
    anon_id = request.client.host
    before = len(anonymous_history[anon_id])
    anonymous_history[anon_id] = [b for b in anonymous_history[anon_id] if b["id"] != book_id]
    after = len(anonymous_history[anon_id])
    if before == after:
        raise HTTPException(status_code=404, detail="Book not found (anonymous)")
    return {"message": "Book deleted from history (anonymous)"}

@api_router.patch("/history/{book_id}")
async def update_history(book_id: str, update: dict = Body(...), request: Request = None, db: Session = Depends(get_db), user: Optional[User] = Depends(get_optional_current_user)):
    if user:
        book = db.query(BookHistory).filter(BookHistory.id == book_id, BookHistory.user_id == user.id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        # Update allowed fields
        for field in ["status", "title", "author", "cover_url"]:
            if field in update:
                setattr(book, field, update[field])
        db.commit()
        db.refresh(book)
        return {"message": "Book updated", "book": {"id": book.id, "status": book.status}}
    # Anonymous user
    anon_id = request.client.host
    for b in anonymous_history[anon_id]:
        if b["id"] == book_id:
            for field in ["status", "title", "author", "cover"]:
                if field in update:
                    b[field] = update[field]
            return {"message": "Book updated (anonymous)", "book": {"id": b["id"], "status": b["status"]}}
    raise HTTPException(status_code=404, detail="Book not found (anonymous)")

@api_router.post("/recommend-books")
async def recommend_books_endpoint(payload: dict = Body(...)):
    import random
    prefs = payload.get("preferences", {})
    query = prefs.get("genre", "bestsellers")
    # Add randomness to the query
    random_keywords = ["fiction", "mystery", "fantasy", "science", "history", "romance", "adventure", "classic", "young adult", "thriller", "biography", "children", "graphic novel", "self-help", "philosophy", "technology"]
    keyword = random.choice(random_keywords)
    full_query = f"{query} {keyword}"
    url = f"https://www.googleapis.com/books/v1/volumes?q={full_query}&maxResults=20&orderBy=relevance"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        data = resp.json()
        all_books = []
        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            rating = info.get("averageRating", 0)
            all_books.append({
                "id": item.get("id"),
                "title": info.get("title", "Unknown"),
                "author": ", ".join(info.get("authors", ["Unknown"])),
                "cover": info.get("imageLinks", {}).get("thumbnail", ""),
                "description": info.get("description", "")[:300],
                "genre": ", ".join(info.get("categories", [])),
                "rating": rating,
                "publishedYear": info.get("publishedDate", ""),
            })
        # Shuffle all books
        random.shuffle(all_books)
        # Prefer books with rating >= 3.5
        high_rated = [b for b in all_books if b["rating"] and b["rating"] >= 3.5]
        others = [b for b in all_books if b not in high_rated]
        recommendations = high_rated[:5]
        if len(recommendations) < 5:
            recommendations += others[:5 - len(recommendations)]
        # Always return 5, shuffled
        random.shuffle(recommendations)
        return {"recommendations": recommendations[:5]}

book_agent = get_agent()

@api_router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Handles the main chat interaction.
    - Optionally authenticates the user to provide personalized context.
    - Builds a detailed context block for the agent.
    - Returns a single response message (no streaming).
    """
    user_query = request.messages[-1]["content"]
    try:
        result = book_agent.run_sync(user_query)
        return {"type": "text_chunk", "content": result}
    except Exception as e:
        tb = traceback.format_exc()
        print(f"Error during agent execution: {tb}")
        return {"type": "error", "message": str(e), "details": tb}

@api_router.post("/chat/triage")
async def chat_triage():
    # Dummy response for now
    return {"handoff": "HANDOFF_TO_RECOMMENDATION"}

app.include_router(api_router)