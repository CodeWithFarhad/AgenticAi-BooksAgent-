import { NextResponse } from "next/server";

const GOOGLE_BOOKS_API_KEY = "AIzaSyD7IfsoOynpHja5DJmKCGrmqv4JHeUCRxM";
const POPULAR_SUBJECTS = [
  "fiction", "mystery", "science", "fantasy", "history", "romance", "self-help", "biography", "adventure", "children"
];

function getRandomSubject() {
  return POPULAR_SUBJECTS[Math.floor(Math.random() * POPULAR_SUBJECTS.length)];
}

export async function POST(req: Request) {
  let preferences = {};
  try {
    preferences = await req.json();
  } catch {}
  // Use genres or mood if available, else random subject
  let query = "";
  if (preferences?.preferences?.genres?.length) {
    query = preferences.preferences.genres[Math.floor(Math.random() * preferences.preferences.genres.length)];
  } else if (preferences?.preferences?.mood) {
    query = preferences.preferences.mood;
  } else {
    query = getRandomSubject();
  }
  // Add randomness to results
  const startIndex = Math.floor(Math.random() * 20);
  const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=8&startIndex=${startIndex}`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ recommendations: [] }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json({ recommendations: data.items || [] });
} 