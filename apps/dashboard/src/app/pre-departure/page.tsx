"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPreDepartureItems, createLogbookEntry } from "@/lib/api";
import { vessel } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import type { PreDepartureItem } from "@/lib/mock-data";

export default function PreDeparturePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<PreDepartureItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [passengerCount, setPassengerCount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPreDepartureItems().then(setItems);
  }, []);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = items.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleComplete() {
    if (!allComplete) return;
    setSubmitting(true);
    setError(null);

    const checkedItems = items
      .filter((item) => checked[item.id])
      .map((item, i) => `${i + 1}. ${item.label}${item.citation ? ` (${item.citation})` : ""} — CHECKED`)
      .join("\n");

    const body = [
      `Pre-Departure Checklist — ${today}`,
      `Vessel: ${vessel.name}`,
      passengerCount ? `Passengers: ${passengerCount}` : null,
      "",
      checkedItems,
      "",
      `All ${totalCount} items verified. Completed at ${new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}.`,
    ].filter((l) => l !== null).join("\n");

    const result = await createLogbookEntry({
      entry_type: "inspection",
      title: "Pre-Departure Checklist",
      body,
      author: user?.displayName || user?.username || "Bridge",
    });

    if (result.success) {
      setSuccess(true);
      setSubmitting(false);
    } else {
      setError(result.error || "Failed to save. Please try again.");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-20 h-20 rounded-full bg-status-green flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold">Checklist Complete</h2>
        <p className="text-sm text-slate-muted text-center">
          Pre-departure checklist logged successfully.
        </p>
        <button
          onClick={() => router.push("/logbook?saved=1")}
          className="bg-status-blue text-white font-semibold px-6 py-3 rounded-lg min-h-[48px]"
        >
          View Logbook
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-6 h-6 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Pre-Departure Checklist</h1>
        <p className="text-sm text-slate-muted mt-1">
          {vessel.name} &middot; {today}
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-muted">{completedCount} of {totalCount} completed</span>
          <span className="font-semibold">
            {Math.round((completedCount / totalCount) * 100)}%
          </span>
        </div>
        <div className="w-full h-2 bg-navy-surface rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allComplete ? "bg-status-green" : completedCount > 0 ? "bg-status-amber" : "bg-slate-muted/30"
            }`}
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className="bg-navy-surface rounded-lg p-4 flex items-center gap-4 w-full text-left min-h-[56px] hover:bg-navy-border/30 transition-colors"
          >
            <div
              className={`w-7 h-7 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                checked[item.id]
                  ? "bg-status-green border-status-green"
                  : "border-slate-muted"
              }`}
            >
              {checked[item.id] && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  checked[item.id] ? "line-through text-slate-muted" : ""
                }`}
              >
                {idx + 1}. {item.label}
              </p>
              {item.citation && (
                <p className="text-xs text-slate-muted">{item.citation}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Passenger count */}
      <div>
        <label className="text-sm text-slate-muted block mb-1">Passenger Count</label>
        <input
          type="number"
          value={passengerCount}
          onChange={(e) => setPassengerCount(e.target.value)}
          placeholder="Number of passengers aboard"
          className="w-full bg-navy-surface border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text placeholder:text-slate-muted/50 min-h-[48px] focus:outline-none focus:border-status-blue"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-status-red/15 border border-status-red/30 text-status-red text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Complete banner */}
      {allComplete && (
        <div className="flex items-center gap-2 text-status-green text-sm font-semibold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Complete Checklist
        </div>
      )}

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={!allComplete || submitting}
        className={`w-full py-4 rounded-lg font-bold text-base min-h-[56px] transition-colors ${
          allComplete && !submitting
            ? "bg-status-green text-white"
            : "bg-navy-surface text-slate-muted cursor-not-allowed"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </span>
        ) : allComplete ? (
          "Complete and Log"
        ) : (
          `${totalCount - completedCount} items remaining`
        )}
      </button>
    </div>
  );
}
