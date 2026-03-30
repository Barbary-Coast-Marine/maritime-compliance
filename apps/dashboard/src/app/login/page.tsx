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
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-status-blue/15 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="1.5" />
                <line x1="12" y1="3" x2="12" y2="7" />
                <line x1="12" y1="17" x2="12" y2="21" />
                <line x1="3" y1="12" x2="7" y2="12" />
                <line x1="17" y1="12" x2="21" y2="12" />
                <line x1="5.6" y1="5.6" x2="8.5" y2="8.5" />
                <line x1="15.5" y1="15.5" x2="18.4" y2="18.4" />
                <line x1="5.6" y1="18.4" x2="8.5" y2="15.5" />
                <line x1="15.5" y1="8.5" x2="18.4" y2="5.6" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-slate-text">Maritime Compliance Platform</h1>
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
