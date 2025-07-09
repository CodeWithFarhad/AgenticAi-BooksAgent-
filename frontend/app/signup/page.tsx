"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import styles from "../chat/chatbg.module.css";
import Link from "next/link";
import { AuthCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, GoogleButton } from "@/components/ui/button";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreed) {
      setError("You must agree to the terms and conditions.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { firstName, lastName }
      }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen w-full ${styles.animatedBg}`}>
      <AuthCard
        title="Sign Up"
        description="Create your account to start discovering and tracking books."
        logo={<span className="text-3xl">📚</span>}
        className="max-w-md px-0 py-0"
        footer={
          <Link href="/signin" className="text-blue-200 hover:underline text-base">
            Already have an account? Sign in
          </Link>
        }
      >
        <form onSubmit={handleSignUp} className="flex flex-col gap-3 w-full px-6 py-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
            />
            <Input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              autoComplete="family-name"
            />
          </div>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button type="button" className="absolute right-3 top-3 text-xs text-neutral-400" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button type="button" className="absolute right-3 top-3 text-xs text-neutral-400" onClick={() => setShowConfirm(v => !v)}>
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="accent-[#a020f0] w-4 h-4"
              required
            />
            I agree to the <a href="#" className="underline hover:text-[#a020f0]">terms and conditions</a>.
          </label>
          <Button type="submit" className="bg-gradient-to-r from-[#a020f0] to-[#3a1c71] hover:from-[#c04cfb] hover:to-[#a020f0] shadow-lg mt-2" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </Button>
        </form>
        <GoogleButton onClick={handleGoogleSignUp} disabled={loading} className="mt-2 px-6" />
        {error && <p className="text-red-300 mt-2 text-center">{error}</p>}
        {success && <p className="text-green-300 mt-2 text-center">Check your email to confirm your account!</p>}
      </AuthCard>
    </div>
  );
} 