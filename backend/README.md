# BookScape AI Agent Backend

## Overview

BookScape AI Agent is a Python-based backend service that powers conversational book recommendations and summaries for the BookScape app. It leverages OpenAI's GPT-4o for natural language understanding and integrates with Supabase for user management, personalization, and chat logging. The agent is designed to be extensible, secure, and easy to integrate with any frontend (e.g., Next.js).

---

## Features

- **Conversational Book Recommendations:**
  - Suggests books based on user-selected genres and moods.
- **Book Summaries:**
  - Generates engaging summaries for any book by title.
- **Personalization:**
  - Uses Supabase to fetch user preferences and history for tailored responses.
- **Chat Logging:**
  - Stores all chat interactions in Supabase for analytics and future personalization.
- **Extensible Agent:**
  - Easily add new tools/functions (e.g., fetch real book data, check availability).

---

## Architecture

```
User (Next.js App)
   |
   |  (POST /agent)
   v
BookScape AI Agent (FastAPI, Python)
   |---> OpenAI GPT-4o (for chat/completions)
   |---> Supabase (for user data, chat logs)
```

---

## Folder Structure

```
/backend/
  main.py            # FastAPI app (agent endpoint)
  requirements.txt   # Python dependencies
  .env               # API keys and secrets (not committed)
  README.md          # This file
```

---

## Setup & Installation

1. **Clone the repo and navigate to `/backend`:**
   ```bash
   cd backend
   ```
2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
3. **Create a `.env` file:**
   ```env
   OPENAI_API_KEY=your-openai-key-here
   SUPABASE_URL=your-supabase-url-here
   SUPABASE_KEY=your-supabase-service-role-key-here
   ```
4. **Run the server:**
   ```bash
   uvicorn main:app --reload
   ```
   The agent will be available at `http://localhost:8000/agent`

---

## API Usage

### **POST `/agent`**

- **Request Body:**
  ```json
  {
    "mode": "suggestion" | "summary",
    "genre": "string (optional)",
    "mood": "string (optional)",
    "book": "string (optional)",
    "user_id": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "reply": "string"
  }
  ```

#### **Examples**
- **Book Recommendation:**
  ```json
  {
    "mode": "suggestion",
    "genre": "Fiction",
    "mood": "Exciting"
  }
  ```
- **Book Summary:**
  ```json
  {
    "mode": "summary",
    "book": "The Hobbit"
  }
  ```

---

## Personalization & Logging

- If `user_id` is provided, the agent can fetch user preferences/history from Supabase to personalize recommendations.
- All chat interactions are logged to a `chat_history` table in Supabase for analytics and future improvements.

---

## Supabase Table Suggestions

- **preferences**
  - `user_id` (string)
  - `genres` (string[])
  - `mood` (string)
  - ...
- **chat_history**
  - `id` (uuid, primary key)
  - `user_id` (string)
  - `prompt` (text)
  - `response` (text)
  - `timestamp` (timestamp)

---

## Extending the Agent

- **Add new endpoints** for more advanced tools (e.g., fetch book details from Google Books API).
- **Integrate OpenAI function-calling** for tool use and multi-step reasoning.
- **Add multi-turn memory** by storing and retrieving conversation context from Supabase.

---

## Security & Best Practices

- **Never commit your `.env` file** or API keys to version control.
- Use the Supabase **service role key** for backend operations (never expose to frontend).
- Limit CORS origins in production for security.

---

## License

MIT 