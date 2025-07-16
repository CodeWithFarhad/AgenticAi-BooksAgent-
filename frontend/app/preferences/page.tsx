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
    <div className="min-h-screen w-full flex justify-center bg-[#101014] py-10">
      <main className="w-full max-w-4xl px-4">
        <Card className="rounded-3xl bg-[#23263A] border border-white/20 shadow-2xl w-full p-0">
          <CardHeader className="px-10 pt-10 pb-4 border-b border-white/10">
            <CardTitle className="text-4xl font-extrabold text-neutral-100 tracking-tight flex items-center gap-3">
              <User className="w-8 h-8 text-[#4F46E5]" />
              Preferences
            </CardTitle>
            <p className="text-lg text-neutral-300 mt-2 font-medium">Personalize your book experience. Select your favorite genres, moods, and more to get tailored recommendations.</p>
          </CardHeader>
          <CardContent className="px-10 py-8 space-y-10">
            {/* Mood & Genres */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><span>Mood</span></div>
                <div className="flex flex-wrap gap-3">
                  {moods.map((mood) => (
                    <button
                      key={mood}
                      className={`px-4 py-2 rounded-full text-base font-medium border transition-colors ${selectedMood === mood ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white border-[#60A5FA] shadow' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !loading && setSelectedMood(mood)}
                      disabled={loading}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><span>Favorite Genres</span></div>
                <div className="flex flex-wrap gap-3">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      className={`px-4 py-2 rounded-full text-base font-medium border transition-colors ${selectedGenres.includes(genre) ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white border-[#60A5FA] shadow' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !loading && toggleGenre(genre)}
                      disabled={loading}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Reading Level & Book Length */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><span>Reading Level</span></div>
                <div className="flex gap-3 flex-wrap">
                  {readingLevels.map((level) => (
                    <button
                      key={level}
                      className={`px-4 py-2 rounded-full text-base font-medium border transition-colors ${selectedLevel === level ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white border-[#60A5FA] shadow' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !loading && setSelectedLevel(level)}
                      disabled={loading}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><span>Preferred Book Length</span></div>
                <div className="flex gap-3 flex-wrap">
                  {bookLengths.map((length) => (
                    <button
                      key={length}
                      className={`px-4 py-2 rounded-full text-base font-medium border transition-colors ${selectedLength === length ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white border-[#60A5FA] shadow' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !loading && setSelectedLength(length)}
                      disabled={loading}
                    >
                      {length}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Language & Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><span>Preferred Language</span></div>
                <div className="flex gap-3 flex-wrap">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      className={`px-4 py-2 rounded-full text-base font-medium border transition-colors ${selectedLanguage === lang ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white border-[#60A5FA] shadow' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !loading && setSelectedLanguage(lang)}
                      disabled={loading}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><span>Preferred Book Format</span></div>
                <div className="flex gap-3 flex-wrap">
                  {formats.map((f) => (
                    <button
                      key={f.label}
                      className={`px-4 py-2 rounded-full text-base font-medium border flex items-center transition-colors ${selectedFormats.includes(f.label) ? 'bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] text-white border-[#60A5FA] shadow' : 'bg-white/10 text-neutral-200 border-white/20 hover:bg-white/20'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !loading && toggleFormat(f.label)}
                      disabled={loading}
                    >
                      {f.icon}{f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Favorite Authors */}
            <div className="pt-2">
              <div className="text-2xl font-extrabold text-white mb-2 flex items-center gap-2"><User className="inline w-5 h-5 mr-2 text-white" />Favorite Authors <span className="text-xs text-neutral-400 ml-2 font-normal">(comma separated)</span></div>
              <input
                type="text"
                value={favoriteAuthors}
                onChange={e => setFavoriteAuthors(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-neutral-400 text-base"
                placeholder="e.g. J.K. Rowling, Stephen King"
                disabled={loading}
              />
            </div>
            {/* Save Button */}
            <div className="pt-6 flex justify-end">
              <Button
                onClick={savePreferences}
                disabled={loading}
                className="bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white rounded-full px-8 py-3 font-bold shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA] text-lg"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin text-[#3B82F6]" /> : saved ? "Saved!" : "Save Preferences"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 