"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCrewList } from "@/lib/admin-api";

export default function CrewRosterPage() {
  const [crew, setCrew] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");

  const loadCrew = async () => {
    setLoading(true);
    try {
      const data = await fetchCrewList({
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        search: search || undefined,
      });
      setCrew(data.crew);
    } catch {
      setCrew([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCrew();
  }, [statusFilter, roleFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => loadCrew(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-status-green/20 text-status-green",
      pending: "bg-status-amber/20 text-status-amber",
      inactive: "bg-status-red/20 text-status-red",
      archived: "bg-slate-muted/20 text-slate-muted",
    };
    return styles[status] || styles.pending;
  };

  const credentialIndicator = (summary: { total: number; expiring: number; expired: number }) => {
    if (summary.expired > 0) return { text: "Expired", style: "text-status-red" };
    if (summary.expiring > 0) return { text: "Expiring", style: "text-status-amber" };
    if (summary.total > 0) return { text: "Current", style: "text-status-green" };
    return { text: "None", style: "text-slate-muted" };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-text">Crew Roster</h1>
        <Link
          href="/admin/crew/new"
          className="bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-4 py-2.5 min-h-[48px] font-medium text-sm flex items-center gap-2 transition-colors"
        >
          + Onboard New Crew
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        <select
          className="bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="captain">Captain</option>
          <option value="engineer">Engineer</option>
          <option value="crew">Crew</option>
          <option value="volunteer">Volunteer</option>
        </select>
        <input
          type="text"
          placeholder="Search name..."
          className="flex-1 min-w-[150px] bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px] focus:border-status-blue focus:ring-1 focus:ring-status-blue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Crew List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
        </div>
      ) : crew.length === 0 ? (
        <div className="text-center text-slate-muted py-12 bg-navy-surface border border-navy-border rounded-xl">
          No crew members found
        </div>
      ) : (
        <div className="space-y-2">
          {crew.map((member) => {
            const cred = credentialIndicator(member.credentialSummary);
            return (
              <Link
                key={member.id}
                href={`/admin/crew/${member.id}`}
                className="block bg-navy-surface border border-navy-border rounded-xl p-4 hover:border-status-blue/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(member.status)}`}>
                        {member.status}
                      </span>
                      <span className="text-sm font-medium text-slate-text truncate">
                        {member.firstName} {member.lastName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-muted">
                      <span>{member.user?.role || (member.isVolunteer ? "volunteer" : "crew")}</span>
                      {member.department && <span>{member.department}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${cred.style}`}>{cred.text}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-muted">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
