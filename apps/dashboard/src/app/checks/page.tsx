"use client";

import { useEffect, useState } from "react";
import { fetchComplianceStatus, logComplianceCompletion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ComplianceCheck, CheckCategory } from "@/lib/mock-data";

const categoryLabels: Record<CheckCategory, string> = {
  drills: "Safety Drills",
  inspections: "Inspections",
  certificates: "Certificates",
  pre_departure: "Pre-Departure",
};

const categoryAccent: Record<CheckCategory, string> = {
  drills: "border-l-status-blue",
  inspections: "border-l-status-green",
  certificates: "border-l-status-amber",
  pre_departure: "border-l-slate-muted",
};

const statusBorderColor: Record<string, string> = {
  overdue: "border-l-status-red",
  warning: "border-l-status-amber",
  passing: "border-l-status-green/40",
};

const categoryOrder: CheckCategory[] = ["drills", "inspections", "certificates", "pre_departure"];

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysOverdue(nextDue: string): number {
  const due = new Date(nextDue);
  const now = new Date();
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ChecksPage() {
  const { user } = useAuth();
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [logFormId, setLogFormId] = useState<string | null>(null);
  const [logAuthor, setLogAuthor] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logFlash, setLogFlash] = useState<string | null>(null);

  useEffect(() => {
    fetchComplianceStatus().then((data) => {
      setChecks(data.checks);
      setLoading(false);
    });
  }, []);

  const openLogForm = (itemId: string) => {
    setLogFormId(itemId);
    setLogAuthor(user?.displayName || "");
    setLogNotes("");
  };

  const closeLogForm = () => {
    setLogFormId(null);
    setLogAuthor("");
    setLogNotes("");
  };

  const handleConfirmLog = async (item: ComplianceCheck) => {
    setLogSaving(true);
    try {
      await logComplianceCompletion(item.id, logAuthor, logNotes || undefined);
      setChecks((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, status: "passing" as const } : c))
      );
      setLogFlash(item.id);
      setTimeout(() => setLogFlash(null), 2000);
      closeLogForm();
    } catch {
      // keep form open on error
    } finally {
      setLogSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Compliance Checks</h1>
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-navy-surface rounded-lg h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Compliance Checks</h1>

      {categoryOrder.map((cat) => {
        const items = checks.filter((c) => c.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat}>
            <h2 className={`text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2 border-l-2 ${categoryAccent[cat]} pl-2`}>
              {categoryLabels[cat]} ({items.length})
            </h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-navy-surface rounded-lg p-4 min-h-[48px] border-l-4 ${statusBorderColor[item.status] || "border-l-status-green/40"}`}
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={item.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-slate-muted">{item.citation}</p>
                    </div>
                    {logFlash === item.id ? (
                      <span className="text-xs font-semibold text-status-green">&#10003; Logged</span>
                    ) : (
                      <StatusBadge status={item.status} />
                    )}
                    {item.status !== "passing" && logFormId !== item.id && (
                      <button
                        onClick={() => openLogForm(item.id)}
                        className="text-xs font-semibold text-status-blue bg-status-blue/15 px-2 py-1 rounded min-h-[32px]"
                      >
                        Log Now
                      </button>
                    )}
                  </div>
                  <div className="flex gap-6 mt-2 ml-6 text-xs text-slate-muted">
                    <span>Last: {formatDate(item.lastCompleted) || "No record on file"}</span>
                    {item.status === "overdue" && item.nextDue && new Date(item.nextDue) < new Date() ? (
                      <span className="text-status-red font-semibold">{daysOverdue(item.nextDue)} days overdue</span>
                    ) : (
                      <span>Next: {formatDate(item.nextDue) || "\u2014"}</span>
                    )}
                  </div>

                  {/* Inline log form */}
                  {logFormId === item.id && (
                    <div className="mt-3 border-t border-navy-border pt-3 space-y-2">
                      <p className="text-xs text-slate-muted font-semibold">{item.title}</p>
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
                          onClick={() => handleConfirmLog(item)}
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
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "passing" ? "bg-status-green" : status === "warning" ? "bg-status-amber" : "bg-status-red";
  return <span className={`w-3 h-3 rounded-full ${color} shrink-0`} />;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    passing: { bg: "bg-status-green/15", text: "text-status-green", label: "OK" },
    warning: { bg: "bg-status-amber/15", text: "text-status-amber", label: "DUE SOON" },
    overdue: { bg: "bg-status-red/15", text: "text-status-red", label: "OVERDUE" },
  };
  const c = config[status] || config.passing;
  return (
    <span className={`${c.bg} ${c.text} text-xs font-semibold px-2 py-1 rounded`}>
      {c.label}
    </span>
  );
}
