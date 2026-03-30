"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLogbook } from "@/lib/api";
import type { LogbookEntry } from "@/lib/mock-data";

const filterTabs = ["All", "Drills", "Inspections", "Fuel", "Maintenance"] as const;
type FilterTab = (typeof filterTabs)[number];

const tabToApiType: Record<FilterTab, string | undefined> = {
  All: undefined,
  Drills: "drill",
  Inspections: "inspection",
  Fuel: "fuel_dip",
  Maintenance: "maintenance",
};

function formatDateTime(d: string) {
  const date = new Date(d);
  return {
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

const typeColors: Record<string, string> = {
  drill: "bg-status-blue",
  inspection: "bg-status-green",
  fuel: "bg-status-amber",
  maintenance: "bg-slate-muted",
  general: "bg-navy-border",
};

const typeIcons: Record<string, string> = {
  drill: "D", inspection: "I", fuel: "F", maintenance: "M", general: "G",
};

export default function LogbookPage() {
  const [filter, setFilter] = useState<FilterTab>("All");
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check for success message from logbook/new redirect
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("saved") === "1") {
        setSuccessMsg("Logbook entry saved successfully.");
        window.history.replaceState({}, "", "/logbook");
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLogbook(tabToApiType[filter], 50, 0).then((data) => {
      setEntries(data.entries);
      setLoading(false);
    });
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Logbook</h1>
        <Link
          href="/logbook/new"
          className="bg-status-blue text-white text-sm font-semibold px-4 py-2 rounded-lg min-h-[40px] flex items-center"
        >
          + New Entry
        </Link>
      </div>

      {successMsg && (
        <div className="bg-status-green/15 border border-status-green/30 text-status-green text-sm p-3 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[40px] transition-colors ${
              filter === tab
                ? "bg-status-blue text-white"
                : "bg-navy-surface text-slate-muted hover:text-slate-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Entry list */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-navy-surface rounded-lg h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const dt = formatDateTime(entry.date);
            return (
              <div
                key={entry.id}
                className="bg-navy-surface rounded-lg p-4 min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-9 h-9 rounded-full ${typeColors[entry.type]} flex items-center justify-center text-xs font-bold text-white shrink-0`}
                  >
                    {typeIcons[entry.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-xs text-slate-muted">
                      {entry.author} &middot; {dt.date} at {dt.time}
                    </p>
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-xs text-slate-muted mt-2 ml-12 line-clamp-2">
                    {entry.notes}
                  </p>
                )}
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="text-sm text-slate-muted text-center py-8">
              No entries found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
