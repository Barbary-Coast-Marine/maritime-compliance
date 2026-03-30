import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maritime Compliance — M/V O'Brien",
  description: "Vessel compliance dashboard",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B1426",
};

const tabs = [
  { href: "/", label: "Bridge", icon: BridgeIcon },
  { href: "/checks", label: "Checks", icon: ChecksIcon },
  { href: "/logbook", label: "Logbook", icon: LogbookIcon },
  { href: "/alerts", label: "Alerts", icon: AlertsIcon },
  { href: "/pre-departure", label: "Pre-Dep", icon: PreDepIcon },
  { href: "/reports", label: "Reports", icon: ReportsIcon },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-navy text-slate-text font-sans min-h-screen pb-20">
        <main className="max-w-3xl mx-auto px-4 pt-4">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 bg-navy-surface border-t border-navy-border">
          <div className="max-w-3xl mx-auto flex justify-around">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center py-3 px-2 min-w-[64px] min-h-[48px] text-slate-muted hover:text-slate-text transition-colors"
              >
                <tab.icon />
                <span className="text-xs mt-1">{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </body>
    </html>
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
