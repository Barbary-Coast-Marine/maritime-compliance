"use client";

import { useEffect, useState } from "react";
import { fetchAlerts, logComplianceCompletion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Alert } from "@/lib/mock-data";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const severityConfig = {
  critical: { bg: "bg-status-red/15", text: "text-status-red", border: "border-status-red/30", label: "CRITICAL" },
  warning: { bg: "bg-status-amber/15", text: "text-status-amber", border: "border-status-amber/30", label: "WARNING" },
  info: { bg: "bg-status-blue/15", text: "text-status-blue", border: "border-status-blue/30", label: "INFO" },
} as const;

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFormId, setLogFormId] = useState<string | null>(null);
  const [logAuthor, setLogAuthor] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logFlash, setLogFlash] = useState<string | null>(null);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

  useEffect(() => {
    fetchAlerts().then((data) => {
      setAlerts(data);
      setLoading(false);
    });
  }, []);

  const openLogForm = (alertId: string) => {
    setLogFormId(alertId);
    setLogAuthor(user?.displayName || "");
    setLogNotes("");
  };

  const closeLogForm = () => {
    setLogFormId(null);
    setLogAuthor("");
    setLogNotes("");
  };

  const handleConfirmLog = async (alert: Alert) => {
    setLogSaving(true);
    try {
      await logComplianceCompletion(alert.id, logAuthor, logNotes || undefined);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a
        )
      );
      setLogFlash(alert.id);
      setTimeout(() => setLogFlash(null), 2000);
      closeLogForm();
    } catch {
      // keep form open on error
    } finally {
      setLogSaving(false);
    }
  };

  const activeAlerts = alerts.filter((a) => !a.resolved);
  const resolvedAlerts = alerts.filter((a) => a.resolved);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Alerts</h1>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-navy-surface rounded-lg h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Alerts</h1>

      {/* Active alerts */}
      <section>
        <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2">
          Active ({activeAlerts.length})
        </h2>
        <div className="space-y-3">
          {activeAlerts.map((alert) => {
            const cfg = severityConfig[alert.severity];
            const showLogNow = alert.severity === "critical" || alert.severity === "warning";
            return (
              <div
                key={alert.id}
                className={`bg-navy-surface rounded-lg p-4 border ${cfg.border} min-h-[48px]`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`${cfg.bg} ${cfg.text} text-xs font-bold px-2 py-1 rounded`}>
                    {cfg.label}
                  </span>
                  {logFlash === alert.id && (
                    <span className="text-xs font-semibold text-status-green">&#10003; Logged</span>
                  )}
                  {alert.dueDate && (
                    <span className="text-xs text-slate-muted ml-auto">
                      Due {formatDate(alert.dueDate)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-slate-muted mt-1">{alert.description}</p>
                {alert.detail && (
                  <button
                    onClick={() => setExpandedDetail(expandedDetail === alert.id ? null : alert.id)}
                    className="text-xs text-status-blue mt-1"
                  >
                    {expandedDetail === alert.id ? "Hide details" : "View details"}
                  </button>
                )}
                {expandedDetail === alert.id && alert.detail && (
                  <p className="text-xs text-slate-muted mt-1 bg-navy/50 rounded p-2">{alert.detail}</p>
                )}
                {showLogNow && logFormId !== alert.id && (
                  <button
                    onClick={() => openLogForm(alert.id)}
                    className={`inline-block mt-3 text-sm font-semibold px-4 py-2 rounded-lg min-h-[40px] ${
                      alert.severity === "critical"
                        ? "bg-status-red text-white"
                        : "bg-status-amber text-navy"
                    }`}
                  >
                    Log Now
                  </button>
                )}

                {/* Inline log form */}
                {logFormId === alert.id && (
                  <div className="mt-3 border-t border-navy-border pt-3 space-y-2">
                    <p className="text-xs text-slate-muted font-semibold">{alert.title}</p>
                    <div>
                      <label className="text-xs text-slate-muted block mb-1">Author</label>
                      <input
                        type="text"
                        value={logAuthor}
                        onChange={(e) => setLogAuthor(e.target.value)}
                        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px] focus:outline-none focus:border-status-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-muted block mb-1">Notes (optional)</label>
                      <textarea
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text focus:outline-none focus:border-status-blue"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmLog(alert)}
                        disabled={logSaving || !logAuthor}
                        className="bg-status-blue text-white text-sm font-semibold px-4 py-2 rounded-lg min-h-[40px] disabled:opacity-50"
                      >
                        {logSaving ? "Saving..." : "Confirm"}
                      </button>
                      <button
                        onClick={closeLogForm}
                        className="bg-navy-surface border border-navy-border text-slate-muted text-sm px-4 py-2 rounded-lg min-h-[40px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {activeAlerts.length === 0 && (
            <p className="text-sm text-status-green text-center py-8">
              No active alerts — all clear.
            </p>
          )}
        </div>
      </section>

      {/* Resolved alerts */}
      {resolvedAlerts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2">
            Resolved
          </h2>
          <div className="space-y-2">
            {resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-navy-surface rounded-lg p-4 opacity-70 min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-status-green shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-slate-muted">
                      Resolved {alert.resolvedAt ? formatDate(alert.resolvedAt) : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
