# main.py

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from agent import run_book_agent_orchestrator

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    mode: str
    genre: str = None
    mood: str = None
    book: str = None
    user_id: str = None
    query: str = None

@app.post("/agent")
async def agent_endpoint(req: AgentRequest, request: Request):
    if req.query:
        user_message = req.query
    elif req.mode == "summary" and req.book:
        user_message = f"Give me a detailed, engaging summary of the book '{req.book}'."
    elif req.mode == "suggestion" and (req.genre or req.mood):
        user_message = f"Recommend me some books in the genre '{req.genre}' for a '{req.mood}' mood."
    else:
        return {"error": "Invalid request"}

    result = await run_book_agent_orchestrator(user_message, request, user_id=req.user_id)
    return {"reply": result["final_output"]}