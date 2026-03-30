"use client";

import { useEffect, useState } from "react";
import { fetchSystemHealth, triggerComplianceCheck } from "@/lib/admin-api";

export default function SystemStatusPage() {
  const [health, setHealth] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [runningCheck, setRunningCheck] = useState(false);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await fetchSystemHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
    setLoading(false);
  };

  const showToast = (msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(""), duration);
  };

  const handleRunCheck = async () => {
    setRunningCheck(true);
    try {
      const result = await triggerComplianceCheck();
      showToast(result.message || "Compliance check triggered");
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
    setRunningCheck(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  if (!health) {
    return (
      <div className="text-center text-slate-muted py-20">
        Unable to fetch system health
        <button onClick={loadHealth} className="block mx-auto mt-4 text-status-blue hover:underline text-sm">
          Retry
        </button>
      </div>
    );
  }

  const db = health.database || {};
  const queue = health.queue || {};
  const ai = health.ai_engine || {};
  const storage = health.storage || {};
  const software = health.software || {};
  const tables = db.tables || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-text">System Status</h1>
        <div className="flex items-center gap-2">
          <StatusDot status={health.status === "healthy" ? "green" : "amber"} />
          <span className="text-sm text-slate-text capitalize">{health.status}</span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Database Card */}
        <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">
              Database
            </h2>
            <StatusDot status={db.status === "connected" ? "green" : "red"} />
          </div>
          <div className="space-y-2">
            <InfoRow label="Status" value={db.status || "unknown"} />
            {Object.keys(tables).length > 0 && (
              <>
                <div className="text-xs text-slate-muted mt-3 mb-1">Row Counts</div>
                {Object.entries(tables).map(([table, count]) => (
                  <div key={table} className="flex justify-between text-sm">
                    <span className="text-slate-muted">{table.replace(/_/g, " ")}</span>
                    <span className="text-slate-text font-mono">{String(count)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Job Queue Card */}
        <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">
              Job Queue
            </h2>
            <StatusDot
              status={
                queue.status === "running"
                  ? "green"
                  : queue.status === "unknown"
                    ? "amber"
                    : "red"
              }
            />
          </div>
          <div className="space-y-2">
            <InfoRow label="Status" value={queue.status || "unknown"} />
            {queue.note && (
              <p className="text-xs text-slate-muted italic">{queue.note}</p>
            )}
            {queue.pending !== undefined && (
              <>
                <InfoRow label="Pending" value={String(queue.pending)} />
                <InfoRow label="Completed" value={String(queue.completed || 0)} />
                <InfoRow label="Failed" value={String(queue.failed || 0)} />
              </>
            )}
            {queue.last_compliance_check && (
              <InfoRow label="Last Check" value={queue.last_compliance_check} />
            )}
          </div>
          <button
            onClick={handleRunCheck}
            disabled={runningCheck}
            className="mt-4 w-full bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-4 py-3 min-h-[48px] font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {runningCheck ? "Running..." : "Run Compliance Check Now"}
          </button>
        </div>

        {/* AI Engine Card */}
        <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">
              AI Engine
            </h2>
            <StatusDot
              status={
                ai.status === "running"
                  ? "green"
                  : ai.status === "loading"
                    ? "amber"
                    : "red"
              }
            />
          </div>
          <div className="space-y-2">
            <InfoRow label="Status" value={ai.status || "unknown"} />
            {ai.model && <InfoRow label="Model" value={ai.model} />}
            {ai.memory_usage && <InfoRow label="Memory" value={ai.memory_usage} />}
            {ai.note && (
              <p className="text-xs text-slate-muted italic mt-2">{ai.note}</p>
            )}
          </div>
        </div>

        {/* Storage Card */}
        <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">
              Storage
            </h2>
          </div>
          <div className="space-y-2">
            <InfoRow label="Upload Directory" value={storage.upload_dir || "—"} />
            {storage.used !== undefined && storage.total !== undefined && (
              <>
                <div className="text-xs text-slate-muted mt-2 mb-1">Disk Usage</div>
                <div className="w-full bg-navy rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-status-blue rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (storage.used / storage.total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-muted">
                  <span>{formatBytes(storage.used)}</span>
                  <span>{formatBytes(storage.total)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Software Card */}
        <div className="bg-navy-surface border border-navy-border rounded-xl p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">
              Software
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoRow label="Version" value={software.version || "—"} />
            <InfoRow label="Node.js" value={software.node_version || "—"} />
            <InfoRow
              label="Timestamp"
              value={
                software.timestamp
                  ? new Date(software.timestamp).toLocaleString()
                  : "—"
              }
            />
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={loadHealth}
        className="w-full bg-navy-surface border border-navy-border text-slate-text rounded-lg px-6 py-3 min-h-[48px] font-medium transition-colors hover:border-status-blue/50 text-sm"
      >
        Refresh Status
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-slate-text shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: "green" | "amber" | "red" }) {
  const colors = {
    green: "bg-status-green",
    amber: "bg-status-amber",
    red: "bg-status-red",
  };
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${colors[status]}`} />
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-muted">{label}</span>
      <span className="text-slate-text text-right">{value}</span>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
