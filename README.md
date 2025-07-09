# Books Agent

**Books Agent** is a professional, full-stack AI-powered books assistant and chatbot. It helps users discover, summarize, and get recommendations for books, complete with ratings, covers, buy links, and personalized features—all in a modern, user-friendly interface.

---

## 🚀 Features
- **AI Book Recommendations:** Get personalized book suggestions by genre and mood.
- **Instant Book Summaries:** Generate detailed, engaging summaries for any book.
- **Add to List/History:** Save books to your reading list or history (works for both guests and logged-in users).
- **Book Details:** View ratings, covers, genres, and direct buy links (Amazon, Z-Library, Goodreads).
- **Search & Discover:** Search for books by title, author, or genre and explore AI-powered recommendations.
- **Seamless Chatbot:** Conversational interface for recommendations, summaries, and more.
- **Modern UI:** Responsive, accessible, and visually appealing design.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js (React), Tailwind CSS
- **Backend:** FastAPI (Python)
- **AI/LLM:** Gemini (Google Generative AI)
- **Book Data:** Google Books API
- **Database/Auth:** Supabase
- **Agent FrameWork:** Open-Ai agent SDK(python)

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/books-agent.git
cd books-agent
```

### 2. Environment Variables
Create `.env` files in both `frontend/` and `backend/` directories with the following variables:

#### **Backend (.env)**
```
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
NYT_API_KEY=your-nyt-api-key
```

#### **Frontend (.env)**
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=your-google-books-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Install Dependencies

#### **Backend**
```bash
cd backend
pip install -r requirements.txt
```

#### **Frontend**
```bash
cd ../frontend
npm install
# or
yarn install
```

### 4. Run the Project

#### **Backend**
```bash
cd backend
uvicorn main:app --reload
```

#### **Frontend**
```bash
cd frontend
npm run dev
# or
yarn dev
```

---

## 📝 Usage
- Visit the frontend URL (default: `http://localhost:3000`).
- Use the chatbot to get book recommendations, summaries, and more.
- Add books to your list/history from Discover or directly from chat responses.
- Click "Buy" to purchase books from Amazon or explore other links.

---

## 🌐 API & Integrations
- **Google Books API:** For book data, covers, ratings, and search.
- **Gemini (Google Generative AI):** For summaries and recommendations.
- **Supabase:** For user authentication and storing preferences/history.

---

## 🤝 Contributing
1. Fork the repo and create your branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m 'Add some feature'`
3. Push to the branch: `git push origin feature/your-feature`
4. Open a Pull Request

---

## 📄 License
This project is licensed under the MIT License.

---

## 🙏 Acknowledgements
- [Google Books API](https://developers.google.com/books/)
- [Gemini Generative AI](https://ai.google.dev/)
- [Supabase](https://supabase.com/)
- [Next.js](https://nextjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)

---

**Books Agent** — Your AI-powered books assistant for discovery, summaries, and recommendations! 