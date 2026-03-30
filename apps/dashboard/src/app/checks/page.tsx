"use client";

import { useEffect, useState } from "react";
import { fetchComplianceStatus } from "@/lib/api";
import type { ComplianceCheck, CheckCategory } from "@/lib/mock-data";

const categoryLabels: Record<CheckCategory, string> = {
  drills: "Safety Drills",
  inspections: "Inspections",
  certificates: "Certificates",
  pre_departure: "Pre-Departure",
};

const categoryOrder: CheckCategory[] = ["drills", "inspections", "certificates", "pre_departure"];

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ChecksPage() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceStatus().then((data) => {
      setChecks(data.checks);
      setLoading(false);
    });
  }, []);

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
            <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2">
              {categoryLabels[cat]}
            </h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-navy-surface rounded-lg p-4 min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={item.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-slate-muted">{item.citation}</p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex gap-6 mt-2 ml-6 text-xs text-slate-muted">
                    <span>Last: {formatDate(item.lastCompleted)}</span>
                    <span>Next: {formatDate(item.nextDue)}</span>
                  </div>
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
