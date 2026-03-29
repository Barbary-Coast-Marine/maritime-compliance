"use client";

import { useState } from "react";
import { vessel, preDepartureItems } from "@/lib/mock-data";

export default function PreDeparturePage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = preDepartureItems.length;
  const allComplete = completedCount === totalCount;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
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
          <span className="text-slate-muted">Progress</span>
          <span className="font-semibold">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        <div className="w-full h-3 bg-navy-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-status-green rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {preDepartureItems.map((item, idx) => (
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

      {/* Complete button */}
      <button
        disabled={!allComplete}
        className={`w-full py-4 rounded-lg font-bold text-base min-h-[56px] transition-colors ${
          allComplete
            ? "bg-status-green text-white"
            : "bg-navy-surface text-slate-muted cursor-not-allowed"
        }`}
      >
        {allComplete ? "Complete and Log" : `${totalCount - completedCount} items remaining`}
      </button>
    </div>
  );
}
