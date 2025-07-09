"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, BookOpen, Headphones, Tablet, Globe, User } from "lucide-react"
import styles from "../chat/chatbg.module.css"
import { supabase } from "@/lib/supabaseClient"

const moods = [
  "Relaxing", "Exciting", "Thoughtful", "Adventurous", "Inspiring", "Dark", "Funny", "Romantic"
]
const genres = [
  "Fiction", "Mystery", "Sci-Fi", "Non-Fiction", "Romance", "Fantasy", "Biography", "History", "Self-Help", "Horror", "Young Adult", "Children", "Comics", "Poetry"
]
const readingLevels = ["Beginner", "Intermediate", "Advanced"]
const bookLengths = ["Short (<200 pages)", "Medium (200-400 pages)", "Long (>400 pages)"]
const languages = ["English", "Spanish", "French", "German", "Chinese", "Japanese", "Other"]
const formats = [
  { label: "Ebook", icon: <Tablet className="inline w-4 h-4 mr-1" /> },
  { label: "Audiobook", icon: <Headphones className="inline w-4 h-4 mr-1" /> },
  { label: "Print", icon: <BookOpen className="inline w-4 h-4 mr-1" /> },
]

export default function PreferencesPage() {
  const [selectedMood, setSelectedMood] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedLevel, setSelectedLevel] = useState("")
  const [selectedLength, setSelectedLength] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState("")
  const [favoriteAuthors, setFavoriteAuthors] = useState("")
  const [selectedFormats, setSelectedFormats] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // Fetch preferences on load
  useEffect(() => {
    if (user) {
      fetchPrefs();
    } else {
      loadGuestPrefs();
    }
  }, [user]);

  // --- Guest logic ---
  function loadGuestPrefs() {
    if (typeof window === 'undefined') return;
    try {
      const data = JSON.parse(localStorage.getItem('guest_preferences') || '{}');
      setSelectedMood(data.mood || "");
      setSelectedGenres(data.genres || []);
      setSelectedLevel(data.readingLevel || "");
      setSelectedLength(data.bookLength || "");
      setSelectedLanguage(data.language || "");
      setFavoriteAuthors(data.favoriteAuthors || "");
      setSelectedFormats(data.formats || []);
    } catch {}
  }
  function saveGuestPrefs(prefs: any) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_preferences', JSON.stringify(prefs));
    }
  }

  // --- API logic ---
  async function fetchPrefs() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/preferences", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const prefs = data.preferences || {};
      setSelectedMood(prefs.mood || "");
      setSelectedGenres(Array.isArray(prefs.genres) ? prefs.genres : (prefs.genres ? JSON.parse(prefs.genres) : []));
      setSelectedLevel(prefs.readingLevel || "");
      setSelectedLength(prefs.bookLength || "");
      setSelectedLanguage(prefs.language || "");
      setFavoriteAuthors(prefs.favoriteAuthors || "");
      setSelectedFormats(Array.isArray(prefs.formats) ? prefs.formats : (prefs.formats ? JSON.parse(prefs.formats) : []));
    } catch {}
    setLoading(false);
  }

  async function savePreferences() {
    setLoading(true);
    setSaved(false);
    const prefs = {
      mood: selectedMood,
      genres: selectedGenres,
      readingLevel: selectedLevel,
      bookLength: selectedLength,
      language: selectedLanguage,
      favoriteAuthors,
      formats: selectedFormats,
    };
    if (!user) {
      saveGuestPrefs(prefs);
      setSaved(true);
      setLoading(false);
      setTimeout(() => setSaved(false), 1200);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
    } finally {
      setLoading(false);
      setTimeout(() => setSaved(false), 1200);
    }
  }

  const toggleGenre = (genre: string) => {
    setSelectedGenres(selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre])
  }
  const toggleFormat = (format: string) => {
    setSelectedFormats(selectedFormats.includes(format)
      ? selectedFormats.filter(f => f !== format)
      : [...selectedFormats, format])
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center ${styles.animatedBg}`}>
      <main className="w-full max-w-3xl px-4 py-12 flex items-center justify-center min-h-screen">
        <Card className="rounded-3xl bg-white/5 border border-white/20 shadow-2xl w-full p-10">
          <CardHeader className="pb-6 flex flex-row items-center gap-4">
            <CardTitle className="text-4xl font-extrabold text-neutral-100 tracking-tight">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-10 px-2 pb-8">
            {/* Mood */}
            <div>
              <div className="text-base text-neutral-400 mb-2">Mood</div>
              <div className="flex flex-wrap gap-3">
                {moods.map((mood) => (
                  <button
                    key={mood}
                    className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${selectedMood === mood ? 'bg-[#a020f0] text-white border-[#c04cfb]' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && setSelectedMood(mood)}
                    disabled={loading}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
            {/* Genres */}
            <div>
              <div className="text-base text-neutral-400 mb-2">Favorite Genres</div>
              <div className="flex flex-wrap gap-3">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${selectedGenres.includes(genre) ? 'bg-[#a020f0] text-white border-[#c04cfb]' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && toggleGenre(genre)}
                    disabled={loading}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
            {/* Reading Level */}
            <div>
              <div className="text-base text-neutral-400 mb-2">Reading Level</div>
              <div className="flex gap-3">
                {readingLevels.map((level) => (
                  <button
                    key={level}
                    className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${selectedLevel === level ? 'bg-[#a020f0] text-white border-[#c04cfb]' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && setSelectedLevel(level)}
                    disabled={loading}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            {/* Book Length */}
            <div>
              <div className="text-base text-neutral-400 mb-2">Preferred Book Length</div>
              <div className="flex gap-3 flex-wrap">
                {bookLengths.map((length) => (
                  <button
                    key={length}
                    className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${selectedLength === length ? 'bg-[#a020f0] text-white border-[#c04cfb]' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && setSelectedLength(length)}
                    disabled={loading}
                  >
                    {length}
                  </button>
                ))}
              </div>
            </div>
            {/* Language */}
            <div>
              <div className="text-base text-neutral-400 mb-2">Preferred Language</div>
              <div className="flex gap-3 flex-wrap">
                {languages.map((lang) => (
                  <button
                    key={lang}
                    className={`px-4 py-2 rounded-lg text-base font-medium border transition-colors ${selectedLanguage === lang ? 'bg-[#a020f0] text-white border-[#c04cfb]' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && setSelectedLanguage(lang)}
                    disabled={loading}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            {/* Favorite Authors */}
            <div>
              <div className="text-base text-neutral-400 mb-2 flex items-center gap-2"><User className="inline w-5 h-5 mr-2" />Favorite Authors</div>
              <input
                type="text"
                value={favoriteAuthors}
                onChange={e => setFavoriteAuthors(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-neutral-400 text-base"
                placeholder="e.g. J.K. Rowling, Stephen King"
                disabled={loading}
              />
            </div>
            {/* Book Format */}
            <div>
              <div className="text-base text-neutral-400 mb-2">Preferred Book Format</div>
              <div className="flex gap-3 flex-wrap">
                {formats.map((f) => (
                  <button
                    key={f.label}
                    className={`px-4 py-2 rounded-lg text-base font-medium border flex items-center transition-colors ${selectedFormats.includes(f.label) ? 'bg-[#a020f0] text-white border-[#c04cfb]' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !loading && toggleFormat(f.label)}
                    disabled={loading}
                  >
                    {f.icon}{f.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Save Button */}
            <div className="pt-4 flex justify-end">
              <Button
                onClick={savePreferences}
                disabled={loading}
                className="bg-[#a020f0] hover:bg-[#c04cfb] text-white rounded-xl px-8 py-3 text-lg font-bold shadow border border-white/20"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : saved ? "Saved!" : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 