"use client";

import { useState } from "react";
import { downloadAuditReport } from "@/lib/api";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const blob = await downloadAuditReport(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-report-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Reports</h1>

      <section className="bg-navy-surface rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider">
          USCG Audit Report
        </h2>
        <p className="text-xs text-slate-muted">
          Generate a PDF report covering compliance status, drill logs, inspection records,
          maintenance history, and certificate expiry for the selected date range.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-muted block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px] focus:outline-none focus:border-status-blue"
            />
          </div>
          <div>
            <label className="text-sm text-slate-muted block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px] focus:outline-none focus:border-status-blue"
            />
          </div>
        </div>

        {error && (
          <div className="bg-status-red/15 border border-status-red/30 text-status-red text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !startDate || !endDate}
          className={`w-full py-4 rounded-lg font-bold text-base min-h-[56px] transition-colors flex items-center justify-center gap-2 ${
            loading || !startDate || !endDate
              ? "bg-navy text-slate-muted cursor-not-allowed border border-navy-border"
              : "bg-status-blue text-white"
          }`}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Generate USCG Audit Report
            </>
          )}
        </button>
      </section>
    </div>
  );
}
