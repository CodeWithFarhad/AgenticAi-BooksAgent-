# FastAPI Backend Setup

## 1. Install dependencies
```
pip install -r requirements.txt
```

## 2. Set up environment variables
- Copy `.env.example` to `.env` and set your DATABASE_URL.

## 3. Run the backend server
```
uvicorn main:app --reload
```

## 4. Test the backend
Visit http://localhost:8000/api/test in your browser. You should see a JSON message. 