import { alerts } from "@/lib/mock-data";

const activeAlerts = alerts.filter((a) => !a.resolved);
const resolvedAlerts = alerts.filter((a) => a.resolved);

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const severityConfig = {
  critical: { bg: "bg-status-red/15", text: "text-status-red", border: "border-status-red/30", label: "CRITICAL" },
  warning: { bg: "bg-status-amber/15", text: "text-status-amber", border: "border-status-amber/30", label: "WARNING" },
  info: { bg: "bg-status-blue/15", text: "text-status-blue", border: "border-status-blue/30", label: "INFO" },
} as const;

export default function AlertsPage() {
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
            return (
              <div
                key={alert.id}
                className={`bg-navy-surface rounded-lg p-4 border ${cfg.border} min-h-[48px]`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`${cfg.bg} ${cfg.text} text-xs font-bold px-2 py-1 rounded`}>
                    {cfg.label}
                  </span>
                  {alert.dueDate && (
                    <span className="text-xs text-slate-muted ml-auto">
                      Due {formatDate(alert.dueDate)}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-slate-muted mt-1">{alert.description}</p>
                {alert.severity === "critical" && (
                  <button className="mt-3 bg-status-red text-white text-sm font-semibold px-4 py-2 rounded-lg min-h-[40px]">
                    Log Now
                  </button>
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
    </div>
  );
}
