"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";

interface User {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check for existing token on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (!stored) {
      setChecked(true);
      return;
    }

    // Validate token with /api/auth/me
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then((data) => {
        setUser(data.user);
        setToken(stored);
        setChecked(true);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        setChecked(true);
      });
  }, []);

  // Redirect to /login if not authenticated (skip for /login page)
  useEffect(() => {
    if (!checked) return;
    if (!token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [checked, token, pathname, router]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || "Invalid credentials" };
      }
      const data = await res.json();
      localStorage.setItem("auth_token", data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Unable to connect to server" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  // Show nothing until we've checked auth (prevents flash)
  if (!checked) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  // Allow /login page to render without auth
  if (!token && pathname === "/login") {
    return (
      <AuthContext.Provider value={{ user, token, isAuthenticated: false, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Block rendering until authenticated (redirect happens in useEffect)
  if (!token) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: true, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
