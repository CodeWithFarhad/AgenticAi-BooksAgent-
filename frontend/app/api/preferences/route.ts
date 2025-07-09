import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// GET: Fetch preferences for the logged-in user
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ preferences: null }, { status: 200 }); // Guests handled on frontend
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ preferences: null }, { status: 200 });
  const { data, error } = await supabase
    .from("preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error || !data) return NextResponse.json({ preferences: null }, { status: 200 });
  return NextResponse.json({ preferences: data });
}

// POST: Set/update preferences for the logged-in user
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { genres, authors } = body;
  // Upsert preferences
  const { error } = await supabase.from("preferences").upsert([
    {
      user_id: user.id,
      genres: Array.isArray(genres) ? JSON.stringify(genres) : genres,
      authors: Array.isArray(authors) ? JSON.stringify(authors) : authors,
    }
  ], { onConflict: ["user_id"] });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
} 