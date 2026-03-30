"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { fetchVessel, fetchComplianceStatus, fetchLogbook } from "@/lib/api";
import type { ComplianceCheck, LogbookEntry } from "@/lib/mock-data";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BridgePage() {
  const [vessel, setVessel] = useState<{ name: string; coiExpiry: string } | null>(null);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [logs, setLogs] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([
        fetchComplianceStatus(),
        fetchLogbook(undefined, 4),
      ]);
      setChecks(c.checks);
      setLogs(l.entries.slice(0, 4));
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      // silently fail on refresh
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchVessel(),
      fetchComplianceStatus(),
      fetchLogbook(undefined, 4),
    ]).then(([v, c, l]) => {
      setVessel(v);
      setChecks(c.checks);
      setLogs(l.entries.slice(0, 4));
      setLoading(false);
      setLastUpdated(new Date());
    });
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refreshData();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshData]);

  // Tick "seconds ago" counter every 10s
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 10000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [lastUpdated]);

  if (loading) return <LoadingSkeleton />;

  const passing = checks.filter((c) => c.status === "passing").length;
  const warnings = checks.filter((c) => c.status === "warning").length;
  const overdue = checks.filter((c) => c.status === "overdue").length;
  const overallStatus = overdue > 0 ? "critical" : warnings > 0 ? "warning" : "compliant";

  const statusConfig = {
    compliant: { color: "bg-status-green", label: "COMPLIANT", ring: "ring-status-green" },
    warning: { color: "bg-status-amber", label: "WARNING", ring: "ring-status-amber" },
    critical: { color: "bg-status-red", label: "CRITICAL", ring: "ring-status-red" },
  } as const;

  const cfg = statusConfig[overallStatus];

  const upcoming = checks
    .filter((c) => c.status !== "passing")
    .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
    .slice(0, 5);

  const updatedText = secondsAgo < 10 ? "Just now" : `${secondsAgo}s ago`;

  return (
    <div className="space-y-5">
      {/* Traffic light hero */}
      <div className="flex flex-col items-center py-6">
        <div className={`w-24 h-24 rounded-full ${cfg.color} ring-4 ${cfg.ring} ring-offset-4 ring-offset-navy flex items-center justify-center`}>
          <span className="text-navy font-bold text-lg">{cfg.label}</span>
        </div>
        <h1 className="text-xl font-bold mt-4">{vessel?.name}</h1>
        <p className="text-slate-muted text-sm">
          COI expires {vessel?.coiExpiry ? formatDate(vessel.coiExpiry) : "\u2014"}
        </p>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox count={passing} label="Passing" color="text-status-green" border="border-status-green/30" />
        <StatBox count={warnings} label="Due Soon" color="text-status-amber" border="border-status-amber/30" />
        <StatBox count={overdue} label="Overdue" color="text-status-red" border="border-status-red/30" />
      </div>

      {/* Last updated indicator */}
      <p className="text-xs text-slate-muted text-center">Last updated {updatedText}</p>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/logbook/new"
          className="bg-status-blue text-white font-semibold text-center py-3 rounded-lg min-h-[48px] flex items-center justify-center"
        >
          + Log Entry
        </Link>
        <Link
          href="/pre-departure"
          className="bg-navy-surface border border-navy-border text-slate-text font-semibold text-center py-3 rounded-lg min-h-[48px] flex items-center justify-center"
        >
          Pre-Departure
        </Link>
      </div>

      {/* Upcoming items */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2">
            Upcoming / Attention
          </h2>
          <div className="space-y-2">
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="bg-navy-surface rounded-lg p-3 flex items-center gap-3 min-h-[48px]"
              >
                <StatusDot status={item.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-slate-muted">{item.citation}</p>
                </div>
                <span className="text-xs text-slate-muted whitespace-nowrap">
                  {item.status === "overdue" ? "Overdue" : `Due ${formatDate(item.nextDue)}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2">
          Recent Activity
        </h2>
        <div className="space-y-2">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="bg-navy-surface rounded-lg p-3 flex items-center gap-3 min-h-[48px]"
            >
              <TypeIcon type={entry.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.title}</p>
                <p className="text-xs text-slate-muted">{entry.author}</p>
              </div>
              <span className="text-xs text-slate-muted whitespace-nowrap">
                {formatDate(entry.date)}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-sm text-slate-muted text-center py-4">No recent activity.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 rounded-full bg-navy-surface" />
        <div className="h-5 w-48 bg-navy-surface rounded mt-4" />
        <div className="h-4 w-32 bg-navy-surface rounded mt-2" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-navy-surface rounded-lg h-20" />
        ))}
      </div>
    </div>
  );
}

function StatBox({ count, label, color, border }: { count: number; label: string; color: string; border: string }) {
  return (
    <div className={`bg-navy-surface rounded-lg p-4 text-center border ${border}`}>
      <p className={`text-3xl font-bold ${color}`}>{count}</p>
      <p className="text-xs text-slate-muted mt-1">{label}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "passing" ? "bg-status-green" : status === "warning" ? "bg-status-amber" : "bg-status-red";
  return <span className={`w-3 h-3 rounded-full ${color} shrink-0`} />;
}

function TypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    drill: "D", inspection: "I", fuel: "F", maintenance: "M", general: "G",
  };
  const colors: Record<string, string> = {
    drill: "bg-status-blue", inspection: "bg-status-green", fuel: "bg-status-amber",
    maintenance: "bg-slate-muted", general: "bg-navy-border",
  };
  return (
    <span className={`w-8 h-8 rounded-full ${colors[type] || "bg-navy-border"} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
      {icons[type] || "?"}
    </span>
  );
}
