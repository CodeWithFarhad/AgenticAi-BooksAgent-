"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "../chat/chatbg.module.css";
import Link from "next/link";
import { AuthCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, GoogleButton } from "@/components/ui/button";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Debug: log session and user
      console.log("Sign in success:", data);
      // Force reload to ensure session is picked up
      window.location.href = "/dashboard";
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
    if (error) setError(error.message);
    // On success, Supabase will redirect automatically
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
      <AuthCard
        title="Sign In"
        description="Welcome back! Please enter your credentials to access your account."
        logo={<span className="text-3xl">📚</span>}
        className="max-w-sm px-0 py-0"
        footer={
          <Link href="/signup" className="text-blue-200 hover:underline text-base">
            Don't have an account? Sign up
          </Link>
        }
      >
        <form onSubmit={handleSignIn} className="flex flex-col gap-3 w-full px-6 py-6">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <Button type="submit" className="bg-gradient-to-r from-[#a020f0] to-[#3a1c71] hover:from-[#c04cfb] hover:to-[#a020f0] shadow-lg mt-2" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <GoogleButton onClick={handleGoogleSignIn} disabled={loading} className="mt-2 px-6" />
        {error && <p className="text-red-300 mt-2 text-center">{error}</p>}
      </AuthCard>
    </div>
  );
} 