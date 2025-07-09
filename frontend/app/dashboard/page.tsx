"use client";
import styles from "../chat/chatbg.module.css";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { BookOpen, User, Mail, Calendar, LogOut, Settings, List, Star } from "lucide-react";
import Link from "next/link";
import { useState as useReactState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [avatarHover, setAvatarHover] = useReactState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      setUser(data?.user ?? null);
      setError(error?.message ?? "");
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Fetch book count
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/history", { headers: { Authorization: `Bearer ${token}` } });
      const dataJson = await res.json();
      setBookCount(Array.isArray(dataJson.books) ? dataJson.books.length : 0);
    });
    // Fetch favorite genres from preferences
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/preferences", { headers: { Authorization: `Bearer ${token}` } });
      const dataJson = await res.json();
      let genres = [];
      if (dataJson.preferences?.genres) {
        if (Array.isArray(dataJson.preferences.genres)) genres = dataJson.preferences.genres;
        else if (typeof dataJson.preferences.genres === 'string') {
          try { genres = JSON.parse(dataJson.preferences.genres); } catch { genres = [dataJson.preferences.genres]; }
        }
      }
      setFavoriteGenres(genres);
    });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/discover";
  };

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
        <div className="bg-black/70 rounded-3xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
        <div className="bg-black/70 rounded-3xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
          <span className="text-white text-lg">You are not signed in.</span>
        </div>
      </div>
    );
  }

  const createdAt = user.created_at ? new Date(user.created_at).toLocaleString() : "-";
  const name = user.user_metadata?.name || user.user_metadata?.full_name || "-";
  const email = user.email || "-";
  const lastLogin = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "-";
  const avatarLetter = name && name !== "-" ? name[0].toUpperCase() : (email[0]?.toUpperCase() || "U");
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-10 max-w-3xl w-full flex flex-col md:flex-row gap-8 items-center border border-white/20">
        {/* Avatar and quick info */}
        <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-1/3">
          <div
            className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#a020f0] to-purple-600 flex items-center justify-center text-4xl font-extrabold text-white shadow-xl border-4 border-white/20 cursor-pointer"
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-full h-full object-cover rounded-full" />
            ) : (
              avatarLetter
            )}
            {avatarHover && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-4 py-2 bg-black/80 text-white text-base rounded-xl shadow-lg z-50 whitespace-nowrap">
                {name}
              </div>
            )}
          </div>
          <div className="text-2xl font-bold text-white drop-shadow">{name}</div>
          <div className="text-base text-neutral-300 flex items-center gap-2"><Mail className="w-5 h-5" />{email}</div>
          <div className="text-base text-neutral-300 flex items-center gap-2"><Calendar className="w-5 h-5" />Joined: {createdAt}</div>
          <div className="text-base text-neutral-300 flex items-center gap-2"><User className="w-5 h-5" />User ID: <span className="break-all">{user.id}</span></div>
          <div className="text-base text-neutral-300 flex items-center gap-2"><Star className="w-5 h-5" />Last Login: {lastLogin}</div>
        </div>
        {/* Details and actions */}
        <div className="flex-1 w-full flex flex-col gap-6">
          <div className="bg-white/10 rounded-2xl p-6 flex flex-col gap-2 border border-white/10">
            <div className="flex items-center gap-3 text-lg text-white font-bold"><BookOpen className="w-6 h-6 text-[#a020f0]" />Books in History: <span className="ml-2 text-[#a020f0]">{bookCount !== null ? bookCount : <span className="text-neutral-400">Loading...</span>}</span></div>
            <div className="flex items-center gap-3 text-lg text-white font-bold"><Settings className="w-6 h-6 text-[#a020f0]" />Favorite Genres: <span className="ml-2 text-[#a020f0]">{favoriteGenres.length > 0 ? favoriteGenres.join(", ") : <span className="text-neutral-400">None set</span>}</span></div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-2">
            <Link href="/history" className="flex-1">
              <button className="w-full bg-gradient-to-r from-[#a020f0] to-[#3a1c71] hover:from-[#c04cfb] hover:to-[#a020f0] text-white font-bold px-6 py-3 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2">
                <List className="w-5 h-5" /> Go to History
              </button>
            </Link>
            <Link href="/preferences" className="flex-1">
              <button className="w-full bg-gradient-to-r from-[#a020f0] to-[#3a1c71] hover:from-[#c04cfb] hover:to-[#a020f0] text-white font-bold px-6 py-3 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2">
                <Settings className="w-5 h-5" /> Preferences
              </button>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg text-lg flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" /> Log Out
            </button>
          </div>
          {error && <p className="text-red-400 mt-4">{error}</p>}
        </div>
      </div>
    </div>
  );
} 