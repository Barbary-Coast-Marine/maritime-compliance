"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
    </AuthProvider>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  // Login page: no nav bar, no padding
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!isAuthenticated) return null;

  const isAdmin = user?.role === "captain" || user?.role === "fleet_manager";

  // Primary 5 tabs always visible
  const primaryTabs = [
    { href: "/", label: "Bridge", icon: BridgeIcon },
    { href: "/checks", label: "Checks", icon: ChecksIcon },
    { href: "/logbook", label: "Logbook", icon: LogbookIcon },
    { href: "/alerts", label: "Alerts", icon: AlertsIcon },
    { href: "/pre-departure", label: "Pre-Dep", icon: PreDepIcon },
  ];

  // Secondary items in "More" drawer
  const moreTabs = [
    { href: "/reports", label: "Reports", icon: ReportsIcon },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: AdminIcon }] : []),
  ];

  // Is anything in "more" currently active?
  const moreIsActive = moreTabs.some((t) => pathname.startsWith(t.href));

  return (
    <>
      {/* User bar */}
      <div className="max-w-3xl mx-auto px-4 pt-3">
        <span className="text-xs text-slate-muted truncate block">
          {user?.displayName || user?.username}
        </span>
      </div>

      {/* Main content — pb accounts for nav height + iPhone safe area */}
      <main className="max-w-3xl mx-auto px-4 pt-2 pb-24">{children}</main>

      {/* More drawer — slides up from behind nav */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMoreOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed bottom-16 left-0 right-0 z-40 bg-navy-surface border-t border-navy-border shadow-xl">
            <div className="max-w-3xl mx-auto px-2 py-2">
              {moreTabs.map((tab) => {
                const isActive = pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-colors ${
                      isActive
                        ? "bg-status-blue/10 text-status-blue"
                        : "text-slate-text hover:bg-navy"
                    }`}
                  >
                    <tab.icon />
                    <span className="text-base font-medium">{tab.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="flex items-center gap-4 px-4 py-4 w-full text-left text-slate-muted hover:text-status-red transition-colors rounded-xl"
              >
                <SignOutIcon />
                <span className="text-base font-medium">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy-surface border-t border-navy-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-3xl mx-auto flex justify-around">
          {primaryTabs.map((tab) => {
            const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center py-2.5 px-1 flex-1 min-h-[56px] transition-colors ${
                  isActive ? "text-status-blue" : "text-slate-muted hover:text-slate-text"
                }`}
              >
                <tab.icon />
                <span className="text-[10px] mt-1 leading-tight text-center">{tab.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center py-2.5 px-1 flex-1 min-h-[56px] transition-colors ${
              moreOpen || moreIsActive ? "text-status-blue" : "text-slate-muted hover:text-slate-text"
            }`}
          >
            <MoreIcon />
            <span className="text-[10px] mt-1 leading-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function BridgeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ChecksIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function LogbookIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function AlertsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

function PreDepIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
