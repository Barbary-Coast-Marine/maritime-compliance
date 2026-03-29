import Link from "next/link";
import { vessel, complianceChecks, logbookEntries } from "@/lib/mock-data";

const passing = complianceChecks.filter((c) => c.status === "passing").length;
const warnings = complianceChecks.filter((c) => c.status === "warning").length;
const overdue = complianceChecks.filter((c) => c.status === "overdue").length;

const overallStatus = overdue > 0 ? "critical" : warnings > 0 ? "warning" : "compliant";

const statusConfig = {
  compliant: { color: "bg-status-green", label: "COMPLIANT", ring: "ring-status-green" },
  warning: { color: "bg-status-amber", label: "WARNING", ring: "ring-status-amber" },
  critical: { color: "bg-status-red", label: "CRITICAL", ring: "ring-status-red" },
} as const;

const upcoming = complianceChecks
  .filter((c) => c.status !== "passing")
  .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime())
  .slice(0, 5);

const recentLogs = logbookEntries.slice(0, 4);

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BridgePage() {
  const cfg = statusConfig[overallStatus];

  return (
    <div className="space-y-5">
      {/* Traffic light hero */}
      <div className="flex flex-col items-center py-6">
        <div className={`w-24 h-24 rounded-full ${cfg.color} ring-4 ${cfg.ring} ring-offset-4 ring-offset-navy flex items-center justify-center`}>
          <span className="text-navy font-bold text-lg">{cfg.label}</span>
        </div>
        <h1 className="text-xl font-bold mt-4">{vessel.name}</h1>
        <p className="text-slate-muted text-sm">
          COI expires {formatDate(vessel.coiExpiry)}
        </p>
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox count={passing} label="Passing" color="text-status-green" border="border-status-green/30" />
        <StatBox count={warnings} label="Due Soon" color="text-status-amber" border="border-status-amber/30" />
        <StatBox count={overdue} label="Overdue" color="text-status-red" border="border-status-red/30" />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/logbook"
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

      {/* Recent activity */}
      <section>
        <h2 className="text-sm font-semibold text-slate-muted uppercase tracking-wider mb-2">
          Recent Activity
        </h2>
        <div className="space-y-2">
          {recentLogs.map((entry) => (
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
        </div>
      </section>
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
    drill: "D",
    inspection: "I",
    fuel: "F",
    maintenance: "M",
    general: "G",
  };
  const colors: Record<string, string> = {
    drill: "bg-status-blue",
    inspection: "bg-status-green",
    fuel: "bg-status-amber",
    maintenance: "bg-slate-muted",
    general: "bg-navy-border",
  };
  return (
    <span className={`w-8 h-8 rounded-full ${colors[type] || "bg-navy-border"} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
      {icons[type] || "?"}
    </span>
  );
}
