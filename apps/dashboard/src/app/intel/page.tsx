"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchIntelFeed, type IntelItem } from "@/lib/api";

function sourceBadgeColor(source: string): string {
  const s = source.toLowerCase();
  if (s.endsWith("uscg.mil") || s === "dco.uscg.mil") {
    return "bg-status-blue/15 text-status-blue border-status-blue/30";
  }
  if (s.endsWith("ecfr.gov")) {
    return "bg-status-green/15 text-status-green border-status-green/30";
  }
  if (s.endsWith("ntsb.gov")) {
    return "bg-status-amber/15 text-status-amber border-status-amber/30";
  }
  return "bg-navy text-slate-muted border-navy-border";
}

function formatDate(d: string | null): string | null {
  if (!d) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function IntelPage() {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIntelFeed();
      setItems(data.items);
      setFetchedAt(data.fetched_at);
    } catch (err) {
      setError((err as Error).message || "Failed to load intel feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Maritime Intel</h1>
          {fetchedAt && (
            <p className="text-xs text-slate-muted mt-1">
              Updated {new Date(fetchedAt).toLocaleString()}
            </p>
          )}
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="text-sm px-3 py-2 rounded-lg bg-navy-surface border border-navy-border text-slate-text hover:bg-navy disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-navy-surface rounded-lg h-32 border border-navy-border" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-status-red/10 border border-status-red/30 rounded-lg p-4 text-sm text-status-red">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-navy-surface border border-navy-border rounded-lg p-6 text-center text-sm text-slate-muted">
          No intel items available right now.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => {
            const dateLabel = formatDate(item.published_date);
            return (
              <li
                key={item.url}
                className="bg-navy-surface border border-navy-border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded border ${sourceBadgeColor(item.source)}`}
                  >
                    {item.source}
                  </span>
                  {dateLabel && (
                    <span className="text-xs text-slate-muted">{dateLabel}</span>
                  )}
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-base font-semibold text-slate-text hover:text-status-blue"
                >
                  {item.title}
                </a>
                {item.snippet && (
                  <p className="text-sm text-slate-muted leading-relaxed">{item.snippet}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-slate-muted text-center pt-4 border-t border-navy-border">
        Powered by Tavily
      </p>
    </div>
  );
}
