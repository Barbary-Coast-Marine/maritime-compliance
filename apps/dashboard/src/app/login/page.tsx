"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to home
  if (isAuthenticated) {
    router.replace("/");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setSubmitting(true);
    setError(null);

    const result = await login(username.trim(), password.trim());
    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error || "Invalid credentials");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4 -mt-4 -mx-4">
      <div className="w-full max-w-sm">
        <div className="bg-navy-surface border border-navy-border border-t-2 border-t-status-blue rounded-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img src="/bcm-logo.png" alt="Barbary Coast Marine" className="h-16 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-text">Vessel Compliance System</h1>
            <p className="text-sm text-slate-muted mt-1">SS Jeremiah O&apos;Brien</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-muted block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text placeholder:text-slate-muted/50 min-h-[48px] focus:outline-none focus:border-status-blue"
              />
            </div>
            <div>
              <label className="text-sm text-slate-muted block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text placeholder:text-slate-muted/50 min-h-[48px] focus:outline-none focus:border-status-blue"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-status-red/15 border border-status-red/30 text-status-red text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || submitting}
              className={`w-full py-3 rounded-lg font-bold text-base min-h-[48px] transition-colors ${
                username.trim() && password.trim() && !submitting
                  ? "bg-status-blue text-white"
                  : "bg-navy-border text-slate-muted cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
