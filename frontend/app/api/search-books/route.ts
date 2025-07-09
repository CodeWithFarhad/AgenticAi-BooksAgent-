import { NextResponse } from "next/server";

const GOOGLE_BOOKS_API_KEY = "AIzaSyD7IfsoOynpHja5DJmKCGrmqv4JHeUCRxM";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  if (!query) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=20`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json({ items: [] }, { status: 500 });
  }
  const data = await res.json();
  return NextResponse.json(data);
} 