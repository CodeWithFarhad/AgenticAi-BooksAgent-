"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import styles from "../chat/chatbg.module.css"
import { supabase } from "@/lib/supabaseClient";
import { useRef, Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

interface Book {
  id: string
  book_id?: string // for Supabase
  title: string
  author: string
  cover?: string
  status: "want" | "inprogress" | "completed"
}

const statusLabels = {
  want: "Want to Read",
  inprogress: "In Progress",
  completed: "Completed",
}

const validStatuses = ["want", "inprogress", "completed"];

export default function HistoryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newBook, setNewBook] = useState({ title: "", author: "", status: "want" })
  const [addError, setAddError] = useState("")
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null);

  // Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  // Fetch books
  useEffect(() => {
    if (user) {
      fetchBooks();
    } else {
      setBooks(getGuestHistory());
    }
    // Sync on tab focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        user ? fetchBooks() : setBooks(getGuestHistory());
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user]);

  // --- Guest logic ---
  function getGuestHistory() {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('guest_history') || '[]');
    } catch { return []; }
  }
  function setGuestHistory(books: Book[]) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('guest_history', JSON.stringify(books));
    }
  }

  // --- API logic ---
  async function fetchBooks() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/history", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setBooks((data.books || []).map((b: any) => ({
        ...b,
        id: b.book_id || b.id // for consistent key
      })));
    } catch (e) {
      setBooks([]);
      setAddError("Could not fetch history.");
      toast({ title: "Error", description: "Could not fetch history.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function addBook() {
    let status = newBook.status;
    if (!validStatuses.includes(status)) status = "want";
    if (!newBook.title || !newBook.author) return;
    if (!user) {
      // Guest: add to localStorage
      const guestBooks = getGuestHistory();
      if (!guestBooks.some(b => b.title === newBook.title && b.author === newBook.author)) {
        const updated = [...guestBooks, { ...newBook, id: newBook.title + newBook.author, status }];
        setGuestHistory(updated);
        setBooks(updated);
        toast({ title: "Added to your preview list!", description: newBook.title });
        setNewBook({ title: "", author: "", status: "want" });
      }
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          book_id: newBook.title + newBook.author, // fallback unique id
          title: newBook.title,
          author: newBook.author,
          cover: "",
          status,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setAddError(err.detail || "Failed to add book");
        toast({ title: "Error", description: err.detail || "Failed to add book", variant: "destructive" });
        throw new Error(err.detail);
      }
      setNewBook({ title: "", author: "", status: "want" });
      toast({ title: "Added to your list!", description: newBook.title });
      fetchBooks();
    } catch (e) {
      setAddError("Could not add book. See console for details.");
      toast({ title: "Error", description: "Could not add book.", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  }

  async function removeBook(id: string) {
    if (!user) {
      // Guest: remove from localStorage
      const guestBooks = getGuestHistory().filter(b => b.id !== id);
      setGuestHistory(guestBooks);
      setBooks(guestBooks);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/history?book_id=${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.detail || "Failed to delete book", variant: "destructive" });
        throw new Error(err.detail);
      }
      fetchBooks();
    } catch (e) {
      toast({ title: "Error", description: "Could not delete book.", variant: "destructive" });
    }
  }

  async function moveBook(id: string, status: Book["status"]) {
    if (!validStatuses.includes(status)) return;
    if (!user) {
      // Guest: update in localStorage
      const guestBooks = getGuestHistory().map(b => b.id === id ? { ...b, status } : b);
      setGuestHistory(guestBooks);
      setBooks(guestBooks);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/history`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ book_id: id, status }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.detail || "Failed to update book", variant: "destructive" });
        throw new Error(err.detail);
      }
      fetchBooks();
    } catch (e) {
      toast({ title: "Error", description: "Could not update book.", variant: "destructive" });
    }
  }

  // --- UI ---
  const stats = {
    want: books.filter((b) => b.status === "want").length,
    inprogress: books.filter((b) => b.status === "inprogress").length,
    completed: books.filter((b) => b.status === "completed").length,
  }

  return (
    <div className={`min-h-screen w-full ${styles.animatedBg}`}>
      <main className="flex-1 flex flex-col p-0 sm:p-8">
        <div className="w-full flex flex-col items-center mt-4 mb-2">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg select-none font-sans" style={{letterSpacing: '0.04em'}}>
            Reading <span className="text-[#a020f0]">History</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-neutral-300 font-normal text-center max-w-xl">
            Track your book journey. Move books between lists, mark as completed, or add new reads!
          </p>
        </div>
        {/* Stats */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-8 justify-center w-full">
          <div className="bg-white/10 rounded-xl p-6 flex-1 text-center shadow-lg min-w-[120px]">
            <div className="text-2xl font-bold font-sans text-white">{stats.want}</div>
            <div className="text-[#A9A9B3] font-medium">Want to Read</div>
          </div>
          <div className="bg-white/10 rounded-xl p-6 flex-1 text-center shadow-lg min-w-[120px]">
            <div className="text-2xl font-bold font-sans text-white">{stats.inprogress}</div>
            <div className="text-[#A9A9B3] font-medium">In Progress</div>
          </div>
          <div className="bg-white/10 rounded-xl p-6 flex-1 text-center shadow-lg min-w-[120px]">
            <div className="text-2xl font-bold font-sans text-white">{stats.completed}</div>
            <div className="text-[#A9A9B3] font-medium">Completed</div>
          </div>
        </div>
        {/* Add Book */}
        <div className="mb-8 flex flex-col sm:flex-row gap-2 items-end justify-center w-full max-w-2xl mx-auto">
          <input
            type="text"
            placeholder="Book Title"
            value={newBook.title}
            onChange={e => setNewBook({ ...newBook, title: e.target.value })}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white placeholder:text-[#A9A9B3] font-sans w-full sm:w-auto"
          />
          <input
            type="text"
            placeholder="Author"
            value={newBook.author}
            onChange={e => setNewBook({ ...newBook, author: e.target.value })}
            className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white placeholder:text-[#A9A9B3] font-sans w-full sm:w-auto"
          />
          {/* Modern dropdown for status */}
          <Menu as="div" className="relative inline-block text-left w-full sm:w-auto">
            <div>
              <Menu.Button className="inline-flex justify-between items-center w-full sm:w-40 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white font-sans focus:outline-none focus:ring-2 focus:ring-[#a020f0]">
                {statusLabels[newBook.status as keyof typeof statusLabels]}
                <ChevronDown className="ml-2 h-4 w-4 text-[#a020f0]" />
              </Menu.Button>
            </div>
            <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
              <Menu.Items className="absolute z-10 mt-2 w-full sm:w-40 origin-top-right rounded-xl bg-[#23272f] shadow-lg ring-1 ring-black/10 focus:outline-none">
                {Object.entries(statusLabels).map(([value, label]) => (
                  <Menu.Item key={value}>
                    {({ active }) => (
                      <button
                        type="button"
                        className={`${active ? 'bg-[#a020f0]/20 text-[#a020f0]' : 'text-white'} group flex w-full items-center rounded-xl px-4 py-2 text-sm font-sans transition-colors`}
                        onClick={() => setNewBook({ ...newBook, status: value })}
                      >
                        {label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
          <Button onClick={addBook} disabled={adding || !newBook.title || !newBook.author} className="bg-[#a020f0] hover:bg-[#c04cfb] text-white rounded-full px-6 py-2 flex items-center gap-2 font-sans w-full sm:w-auto">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
        {addError && <div className="text-red-400 text-sm mt-2 w-full text-center">{addError}</div>}
        {/* Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {(["want", "inprogress", "completed"] as Book["status"][]).map((status) => (
            <div key={status} className="bg-transparent rounded-2xl p-0">
              <h2 className="text-xl font-bold mb-4 text-white font-sans text-center">{statusLabels[status]}</h2>
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#a020f0]" /></div>
              ) : (
                <ul className="space-y-4">
                  {books.filter((b) => b.status === status && validStatuses.includes(b.status)).map((book) => (
                    <li key={book.id} className="flex items-center gap-4 bg-white/10 rounded-2xl px-6 py-4 shadow-lg font-sans">
                      <div className="w-12 h-16 bg-gradient-to-br from-[#a020f0] to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        {book.cover ? (
                          <img src={book.cover} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <BookOpen className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-lg truncate font-sans">{book.title}</div>
                        <div className="text-[#A9A9B3] text-sm truncate font-sans">{book.author}</div>
                      </div>
                      <div className="flex gap-2">
                        {/* Replace the three status move buttons with a dropdown menu */}
                        <Menu as="div" className="relative inline-block text-left">
                          <Menu.Button className="bg-transparent hover:bg-white/20 text-white rounded-full px-3 py-1 flex items-center gap-1 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#a020f0]">
                            Move <ChevronDown className="ml-1 h-4 w-4 text-[#a020f0]" />
                          </Menu.Button>
                          <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                            <Menu.Items className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-xl bg-[#23272f] shadow-lg ring-1 ring-black/10 focus:outline-none">
                              {Object.entries(statusLabels).filter(([value]) => value !== status).map(([value, label]) => (
                                <Menu.Item key={value}>
                                  {({ active }) => (
                                    <button
                                      type="button"
                                      className={`${active ? 'bg-[#a020f0]/20 text-[#a020f0]' : 'text-white'} group flex w-full items-center rounded-xl px-4 py-2 text-sm font-sans transition-colors`}
                                      onClick={() => moveBook(book.id, value as Book["status"])}
                                    >
                                      {label}
                                    </button>
                                  )}
                                </Menu.Item>
                              ))}
                            </Menu.Items>
                          </Transition>
                        </Menu>
                        <Button className="bg-red-600 hover:bg-red-700 text-white rounded-full px-3 py-1" onClick={() => removeBook(book.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
} 