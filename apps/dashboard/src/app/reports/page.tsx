"use client";

import { useState } from "react";
import { downloadAuditReport, downloadDrillReport, downloadPreDepartureReport } from "@/lib/api";

type Preset = "30d" | "90d" | "year" | "all" | null;

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function startOfYear() {
  return `${new Date().getFullYear()}-01-01`;
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(todayStr);
  const [activePreset, setActivePreset] = useState<Preset>("30d");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset);
    switch (preset) {
      case "30d":
        setStartDate(daysAgo(30));
        setEndDate(todayStr());
        break;
      case "90d":
        setStartDate(daysAgo(90));
        setEndDate(todayStr());
        break;
      case "year":
        setStartDate(startOfYear());
        setEndDate(todayStr());
        break;
      case "all":
        setStartDate("2020-01-01");
        setEndDate(todayStr());
        break;
    }
  };

  const handleDateChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setActivePreset(null);
  };

  async function downloadReport(type: "audit" | "drills" | "pre-departure") {
    setLoading(type);
    setError(null);

    try {
      let blob: Blob;
      let filename: string;
      switch (type) {
        case "audit":
          blob = await downloadAuditReport(startDate, endDate);
          filename = `audit-report-${endDate}.pdf`;
          break;
        case "drills":
          blob = await downloadDrillReport(startDate, endDate);
          filename = `drill-report-${endDate}.pdf`;
          break;
        case "pre-departure":
          blob = await downloadPreDepartureReport(startDate, endDate);
          filename = `pre-departure-report-${endDate}.pdf`;
          break;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message || "Failed to generate report.");
    } finally {
      setLoading(null);
    }
  }

  const presets: { key: Preset; label: string }[] = [
    { key: "30d", label: "Last 30 days" },
    { key: "90d", label: "Last 90 days" },
    { key: "year", label: "This Year" },
    { key: "all", label: "All Time" },
  ];

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

        {/* Quick-select preset buttons */}
        <div className="flex gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border min-h-[32px] transition-colors ${
                activePreset === p.key
                  ? "bg-status-blue/20 text-status-blue border-status-blue/50"
                  : "bg-navy border-navy-border text-slate-muted"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-slate-muted block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={handleDateChange(setStartDate)}
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text min-h-[48px] focus:outline-none focus:border-status-blue"
            />
          </div>
          <div>
            <label className="text-sm text-slate-muted block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={handleDateChange(setEndDate)}
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
          onClick={() => downloadReport("audit")}
          disabled={loading !== null || !startDate || !endDate}
          className={`w-full py-4 rounded-lg font-bold text-base min-h-[56px] transition-colors flex items-center justify-center gap-2 ${
            loading !== null || !startDate || !endDate
              ? "bg-navy text-slate-muted cursor-not-allowed border border-navy-border"
              : "bg-status-blue text-white"
          }`}
        >
          {loading === "audit" ? (
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

        {/* Additional report types */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => downloadReport("drills")}
            disabled={loading !== null || !startDate || !endDate}
            className={`py-3 rounded-lg font-semibold text-sm min-h-[48px] transition-colors flex items-center justify-center gap-2 border ${
              loading !== null || !startDate || !endDate
                ? "bg-navy text-slate-muted cursor-not-allowed border-navy-border"
                : "bg-navy-surface border-navy-border text-slate-text hover:border-status-blue"
            }`}
          >
            {loading === "drills" ? (
              <span className="w-4 h-4 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            Drill Report
          </button>
          <button
            onClick={() => downloadReport("pre-departure")}
            disabled={loading !== null || !startDate || !endDate}
            className={`py-3 rounded-lg font-semibold text-sm min-h-[48px] transition-colors flex items-center justify-center gap-2 border ${
              loading !== null || !startDate || !endDate
                ? "bg-navy text-slate-muted cursor-not-allowed border-navy-border"
                : "bg-navy-surface border-navy-border text-slate-text hover:border-status-blue"
            }`}
          >
            {loading === "pre-departure" ? (
              <span className="w-4 h-4 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            Pre-Departure Report
          </button>
        </div>
      </section>
    </div>
  );
}
