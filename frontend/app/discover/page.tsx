"use client"

import React, { useState, useEffect } from "react"
import { Search, Sparkles, BookOpen, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import styles from "../chat/chatbg.module.css"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabaseClient"
import { getRecommendedBooks } from "@/lib/googleBooks";
import { useRouter } from "next/navigation";
import Aurora from "./Aurora";

interface Book {
  id: string
  title: string
  author: string
  cover?: string
  description?: string
  genre?: string
  rating?: number
  publishedYear?: number
  amazonLink?: string
  buy_links?: string[]
}

function UserNav({ user }: { user: any }) {
  const [hover, setHover] = useState(false);
  if (user) {
    const name = user.user_metadata?.name || user.user_metadata?.full_name || user.email || "User";
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const avatarLetter = user.email?.[0]?.toUpperCase() ?? "U";
    return (
      <Link href="/dashboard" className="absolute top-6 right-8 z-40">
        <div
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#a020f0] to-purple-600 flex items-center justify-center text-xl font-extrabold text-white shadow-xl border-2 border-white/20 cursor-pointer"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" />
          ) : (
            avatarLetter
          )}
          {hover && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-4 py-2 bg-black/80 text-white text-base rounded-xl shadow-lg z-50 whitespace-nowrap">
              {name}
            </div>
          )}
        </div>
      </Link>
    )
  }
  return (
    <div className="absolute top-6 right-8 z-40">
      <Link href="/signin">
        <Button className="bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white font-bold px-4 py-1 rounded-full text-base shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA]">
          Get Started
        </Button>
      </Link>
    </div>
  )
}

export default function DiscoverPage() {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("")
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [preferences, setPreferences] = useState<any>({})
  const [history, setHistory] = useState<Book[]>([])
  const { toast } = useToast()
  const router = useRouter();

  // Fetch user on mount and on auth state change
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener?.subscription.unsubscribe()
  }, [])

  // Fetch user preferences and recommendations on mount
  useEffect(() => {
    const fetchPrefsAndRecs = async () => {
      try {
        const res = await fetch("/api/preferences")
        let prefs = {}
        if (res.ok) {
          prefs = await res.json()
          setPreferences(prefs)
        }
        await getRecommendedBooks().then(setRecommendedBooks);
      } catch {
        await getRecommendedBooks().then(setRecommendedBooks);
      }
    }
    fetchPrefsAndRecs()
  }, [])

  // Fetch history on mount
  useEffect(() => {
    fetchHistory()
  }, [])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setBooks([])
      return
    }
    const handler = setTimeout(() => {
      searchBooks(searchQuery)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Restore state from localStorage on mount (but not after refresh button)
  useEffect(() => {
    const savedBooks = localStorage.getItem("discover_books");
    const savedRecs = localStorage.getItem("discover_recommendations");
    const savedHistory = localStorage.getItem("discover_history");
    if (savedBooks) setBooks(JSON.parse(savedBooks));
    if (savedRecs) setRecommendedBooks(JSON.parse(savedRecs));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    // eslint-disable-next-line
  }, []);

  // Persist books, recommendations, and history to localStorage when they change
  useEffect(() => {
    localStorage.setItem("discover_books", JSON.stringify(books));
  }, [books]);
  useEffect(() => {
    localStorage.setItem("discover_recommendations", JSON.stringify(recommendedBooks));
  }, [recommendedBooks]);
  useEffect(() => {
    localStorage.setItem("discover_history", JSON.stringify(history));
  }, [history]);

  // Listen for guest history changes in other tabs/pages
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'guest_history') {
        setHistory(getGuestHistory());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const searchBooks = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/search-books?query=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Search failed")
      const data = await response.json()
      setBooks(data.items?.map((item: any) => {
        const info = item.volumeInfo;
        let isbn = null;
        if (info.industryIdentifiers) {
          const isbn13 = info.industryIdentifiers.find((id: any) => id.type === "ISBN_13");
          const isbn10 = info.industryIdentifiers.find((id: any) => id.type === "ISBN_10");
          isbn = isbn13?.identifier || isbn10?.identifier || null;
        }
        let titleForUrl = encodeURIComponent(info.title);
        let buy_links = [
          `https://www.amazon.com/s?k=${titleForUrl}`,
          `https://www.goodreads.com/search?q=${titleForUrl}`,
          `https://www.bookscape.co/search?q=${titleForUrl}`
        ];
        return {
          id: item.id,
          title: info.title,
          author: (info.authors || []).join(", "),
          cover: info.imageLinks?.thumbnail,
          description: info.description,
          genre: (info.categories || []).join(", "),
          rating: info.averageRating,
          publishedYear: info.publishedDate,
          buy_links,
        }
      }) || [])
    } catch (error) {
      setBooks([])
    } finally {
      setIsLoading(false)
    }
  }

  const getRecommendations = async (prefs: any = preferences, skipRestore = false) => {
    setLoadingRecommendations(true)
    setRecommendedBooks([])
    try {
      const response = await fetch("/api/recommend-books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      })
      if (!response.ok) throw new Error("Failed to get recommendations")
      const data = await response.json()
      // Map Google Books API items to Book interface
      const mapped = (data.recommendations || []).map((item: any) => ({
        id: item.id,
        title: item.volumeInfo?.title || "Untitled",
        author: (item.volumeInfo?.authors || []).join(", "),
        cover: item.volumeInfo?.imageLinks?.thumbnail || "",
        description: item.volumeInfo?.description || "",
        genre: (item.volumeInfo?.categories || []).join(", "),
        rating: item.volumeInfo?.averageRating,
        publishedYear: item.volumeInfo?.publishedDate,
      }))
      setRecommendedBooks(mapped)
      localStorage.setItem("discover_recommendations", JSON.stringify(mapped))
    } catch (error) {
      setRecommendedBooks([])
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const fetchHistory = async () => {
    const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
    const token = session?.access_token;
    try {
      const res = await fetch("/api/history", {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setHistory(data.books || []);
    } catch {
      setHistory([]);
    }
  }

  const getGuestHistory = () => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('guest_history') || '[]');
    } catch { return []; }
  };
  const setGuestHistory = (books: Book[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_history', JSON.stringify(books));
    }
  };
  const addToHistory = async (book: Book) => {
    if (user) {
      const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;
      const safeBook = {
        book_id: book.id,
        title: book.title || "",
        author: book.author || "",
        cover: book.cover || "",
        status: "want",
      };
      try {
        const res = await fetch("/api/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(safeBook),
        });
        if (!res.ok) throw new Error("Failed to add book");
        toast({ title: "Added to your list!", description: book.title });
        router.push("/history");
      } catch {
        toast({ title: "Error", description: "Could not add book to your list.", variant: "destructive" });
      }
    } else {
      // Guest: add to localStorage
      const guestBooks = getGuestHistory();
      if (!guestBooks.some(b => b.id === book.id)) {
        setGuestHistory([...guestBooks, { ...book, status: 'want' }]);
        toast({ title: "Added to your preview list!", description: book.title });
        router.push("/history");
      }
    }
  };
  const isInHistory = (id: string) => {
    if (user) return history.some(b => b.id === id);
    const guestBooks = getGuestHistory();
    return guestBooks.some(b => b.id === id);
  };

  // Remove from history (user and guest)
  const removeFromHistory = async (book: Book) => {
    if (user) {
      const session = supabase.auth.getSession ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;
      try {
        await fetch(`/api/history?id=${book.id}`, {
          method: "DELETE",
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
        setHistory((prev) => prev.filter((b) => b.id !== book.id));
        toast({ title: "Removed from your list!", description: book.title });
      } catch {
        toast({ title: "Error", description: "Could not remove book from your list.", variant: "destructive" });
      }
    } else {
      // Guest: remove from localStorage
      const guestBooks = getGuestHistory();
      setGuestHistory(guestBooks.filter((b) => b.id !== book.id));
      setHistory((prev) => prev.filter((b) => b.id !== book.id));
      toast({ title: "Removed from your preview list!", description: book.title });
    }
  };

  // Handler to go to chat page and trigger summary
  const goToSummary = (title: string) => {
    router.push(`/chat?summary=${encodeURIComponent(title)}`);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full pt-1 pb-1 min-h-screen bg-gradient-to-br from-[#0B0D12] via-[#101014] to-[#181A20] overflow-hidden">
      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-80 z-0">
        <Aurora colorStops={["#101432", "#1a237e", "#23263A"]} amplitude={0.7} blend={0.5} />
      </div>
      <UserNav user={user} />
      {/* Stylish Logo */}
      <h1
        className="text-6xl md:text-8xl font-extrabold tracking-tight text-white drop-shadow-xl select-none font-sans mb-2 logo-hover-animate"
        style={{ letterSpacing: '0.06em', fontFamily: 'Montserrat, Inter, sans-serif' }}
      >
        <span className="text-[#111112]">Book</span>Genie
      </h1>
      <style jsx global>{`
        .logo-hover-animate {
          position: relative;
          display: inline-block;
          background: linear-gradient(90deg, #fff 0%, #60A5FA 40%, #3B82F6 60%, #fff 100%);
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          transition: background-position 0.5s cubic-bezier(.4,0,.2,1);
        }
        .logo-hover-animate:hover {
          background-position: 100% 0;
          transition: background-position 0.7s cubic-bezier(.4,0,.2,1);
        }
      `}</style>
      <p className="mt-2 text-xl md:text-2xl text-neutral-300 font-medium text-center max-w-2xl mb-3">
        <span className="font-bold text-white glow-white">Discover books, get AI-powered recommendations, and explore details instantly</span>
      </p>
      {/* Search Bar */}
      <form
        className="relative mb-3 flex flex-col items-center w-full"
        onSubmit={e => { e.preventDefault(); searchBooks(searchQuery); }}
      >
        <div className="relative w-full max-w-3xl transition-all duration-300 focus-within:scale-105">
          <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 h-7 w-7 text-[#A9A9B3]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search for books by title, author, or genre..."
            className="w-full pl-16 pr-24 py-6 text-2xl bg-white/10 border-white/20 rounded-3xl text-white placeholder:text-[#A9A9B3] focus-visible:ring-2 focus-visible:ring-[#a020f0] shadow-xl transition-all duration-300"
          />
          <Button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white rounded-full px-4 py-1 text-base font-bold shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA]"
          >
            Search
          </Button>
        </div>
      </form>
      {/* AI Recommendation Card (hide when searching) */}
      {searchQuery.trim() === "" && (
        <div className="w-full max-w-3xl mb-3">
          <Card className="bg-[#101014] border-white/20 rounded-2xl shadow-2xl p-8 backdrop-blur-xl flex flex-col items-center">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-7 w-7 text-[#4F46E5]" />
              <span className="text-2xl font-bold text-white">AI Recommendations</span>
            </div>
            <Button
              onClick={() => getRecommendedBooks().then(setRecommendedBooks)}
              className="bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white rounded-full px-4 py-1 text-base font-bold shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA] mb-4"
            >
              Refresh Recommendations
            </Button>
            {recommendedBooks.length > 0 ? (
              <ul className="w-full space-y-4 mt-2">
                {recommendedBooks.map((rec, idx) => {
                  // Find the first valid Amazon or Goodreads link
                  const validBuyLink = (rec.buy_links || []).find(link =>
                    link.includes('amazon.com') || link.includes('goodreads.com')
                  );
                  return (
                    <li key={`${rec.id}-${idx}`} className="flex items-center gap-4 bg-[#111624] rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:border-[#4F46E5] hover:border-2 group cursor-pointer">
                      <div className="w-14 h-20 bg-gradient-to-br from-[#a020f0] to-purple-600 rounded-lg flex items-center justify-center overflow-hidden">
                        {rec.cover ? (
                          <img src={rec.cover} alt={rec.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <BookOpen className="h-7 w-7 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-bold text-white line-clamp-2">{rec.title}</div>
                        <div className="text-[#A9A9B3] text-base">{rec.author}</div>
                        {(() => {
                          const displayRating = typeof rec.rating === 'number' && rec.rating > 0
                            ? rec.rating
                            : parseFloat((Math.random() * 1.5 + 3.5).toFixed(1));
                          return (
                            <div className="text-yellow-400 text-lg font-bold flex items-center mt-1">
                              {displayRating > 0 ? "★".repeat(Math.round(displayRating)) : <span className="text-[#A9A9B3]">No rating</span>}
                              <span className="ml-1 text-white text-base font-medium">{displayRating.toFixed(1)}</span>
                            </div>
                          );
                        })()}
                        {rec.description && <div className="text-sm text-neutral-300 mt-1 line-clamp-2">{rec.description}</div>}
                      </div>
                      <div className="flex flex-row flex-wrap gap-2 items-center">
                        <Button
                          onClick={() => isInHistory(rec.id) ? removeFromHistory(rec) : addToHistory(rec)}
                          className={`bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[110px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA] ${isInHistory(rec.id) ? 'opacity-80' : ''}`}
                        >
                          {isInHistory(rec.id) ? "Added" : "Add to List"}
                        </Button>
                        <Button
                          className="bg-gradient-to-r from-[#FDE68A] via-[#F59E42] to-[#FBBF24] hover:from-[#F59E42] hover:to-[#FDE68A] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[110px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#F59E42]"
                          onClick={() => goToSummary(rec.title)}
                        >
                          Summary
                        </Button>
                        {validBuyLink && (
                          <a href={validBuyLink} target="_blank" rel="noopener noreferrer">
                            <Button className="bg-gradient-to-r from-[#F87171] via-[#EF4444] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#F87171] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[80px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#EF4444]">
                              Buy
                            </Button>
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-neutral-400 text-center mt-4">No recommendations found.</div>
            )}
          </Card>
        </div>
      )}
      {/* Book Results Grid */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-8 mt-4">
        {isLoading && (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
            <span className="ml-2 text-[#A9A9B3]">Searching books...</span>
          </div>
        )}
        {books.map((book) => (
          <Card key={`${book.id}-${book.author || ''}-${book.title || ''}`} className="bg-[#111624] border-white/20 transition-all duration-300 rounded-2xl group cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-[#4F46E5] hover:border-2">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-20 h-28 bg-gradient-to-br from-[#23263A] to-[#111624] rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden transition-all group-hover:ring-4 group-hover:ring-[#4F46E5]">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <BookOpen className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl font-bold text-white line-clamp-2 group-hover:text-[#4F46E5] transition-colors">
                    {book.title}
                  </CardTitle>
                  <p className="text-[#A9A9B3] text-base mt-1">{book.author}</p>
                  {(() => {
                    const displayRating = typeof book.rating === 'number' && book.rating > 0
                      ? book.rating
                      : parseFloat((Math.random() * 1.5 + 3.5).toFixed(1));
                    return (
                      <div className="text-yellow-400 text-lg font-bold flex items-center mt-1">
                        {displayRating > 0 ? "★".repeat(Math.round(displayRating)) : <span className="text-[#A9A9B3]">No rating</span>}
                        <span className="ml-1 text-white text-base font-medium">{displayRating.toFixed(1)}</span>
                      </div>
                    );
                  })()}
                  {/* Show a fake percentage match for demo purposes */}
                  <div className="text-green-400 text-sm font-semibold mt-1">{Math.floor(70 + Math.random() * 30)}% match</div>
                  {book.genre && (
                    <span className="inline-block mt-2 bg-white/5 border border-white/20 text-[#A9A9B3] rounded-full px-3 py-1 text-xs font-semibold">
                      {book.genre}
                    </span>
                  )}
                  <div className="flex flex-row flex-wrap gap-2 mt-2 items-center">
                    <Button
                      onClick={() => isInHistory(book.id) ? removeFromHistory(book) : addToHistory(book)}
                      className={`bg-gradient-to-r from-[#4F46E5] via-[#60A5FA] to-[#3B82F6] hover:from-[#60A5FA] hover:to-[#4F46E5] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[110px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#60A5FA] ${isInHistory(book.id) ? 'opacity-80' : ''}`}
                    >
                      {isInHistory(book.id) ? "Added" : "Add to List"}
                    </Button>
                    {(book.buy_links && book.buy_links[0]) ? (
                      <a href={book.buy_links[0]} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-gradient-to-r from-[#F87171] via-[#EF4444] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#F87171] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[80px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#EF4444]">
                          Buy
                        </Button>
                      </a>
                    ) : book.amazonLink && (
                      <a href={book.amazonLink} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-gradient-to-r from-[#F87171] via-[#EF4444] to-[#B91C1C] hover:from-[#EF4444] hover:to-[#F87171] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[80px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#EF4444]">
                          Buy
                        </Button>
                      </a>
                    )}
                    <Button
                      className="bg-gradient-to-r from-[#FDE68A] via-[#F59E42] to-[#FBBF24] hover:from-[#F59E42] hover:to-[#FDE68A] text-white rounded-full px-4 py-2 text-sm font-bold min-w-[110px] shadow transition-colors duration-200 border-0 focus:outline-none focus:ring-2 focus:ring-[#F59E42]"
                      onClick={() => goToSummary(book.title)}
                    >
                      Summary
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {book.description && <p className="text-base text-[#A9A9B3] mb-4 line-clamp-3">{book.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {!user && <div className="text-xs text-yellow-300 mt-2">Sign up to save your list and access it from any device!</div>}
    </div>
  )
} 
