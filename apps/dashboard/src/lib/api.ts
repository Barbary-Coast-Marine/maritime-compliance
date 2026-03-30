// API client for vessel-agent backend
// Falls back to mock data when API is unreachable

import {
  vessel as mockVessel,
  complianceChecks as mockChecks,
  logbookEntries as mockLogbook,
  alerts as mockAlerts,
  preDepartureItems as mockPreDep,
  type ComplianceCheck,
  type ComplianceStatus,
  type CheckCategory,
  type LogbookEntry,
  type Alert,
  type PreDepartureItem,
} from "./mock-data";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...init?.headers as Record<string, string>,
  };

  // Include auth token when available
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("maritime_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Vessel ──────────────────────────────────────────────

export async function fetchVessel() {
  try {
    const data = await apiFetch<{
      vessel: {
        id: string;
        name: string;
        imoNumber: string | null;
        vesselType: string;
        grossTonnage: string;
        yearBuilt: number | null;
        coiExpiry: string | null;
        lastDrydock: string | null;
        complianceStatus: string;
      };
    }>("/api/vessel");
    const v = data.vessel;
    return {
      name: v.name,
      imo: v.imoNumber || "",
      type: v.vesselType,
      grossTonnage: Number(v.grossTonnage),
      yearBuilt: v.yearBuilt || 0,
      coiExpiry: v.coiExpiry || "",
      lastDrydock: v.lastDrydock || "",
      complianceStatus: v.complianceStatus,
    };
  } catch {
    return mockVessel;
  }
}

// ── Compliance ──────────────────────────────────────────

function mapVerdict(verdict: string): ComplianceStatus {
  if (verdict === "pass") return "passing";
  if (verdict === "warning") return "warning";
  return "overdue"; // violation, etc.
}

function mapCategory(cat: string): CheckCategory {
  if (cat.toLowerCase().includes("drill")) return "drills";
  if (cat.toLowerCase().includes("inspect")) return "inspections";
  if (cat.toLowerCase().includes("cert")) return "certificates";
  if (cat.toLowerCase().includes("pre") || cat.toLowerCase().includes("depart")) return "pre_departure";
  return "inspections"; // default
}

interface ComplianceResponse {
  vessel_id: string;
  status: string;
  summary: {
    total: number;
    passing: number;
    warnings: number;
    violations: number;
    info: number;
  };
  evaluations: Array<{
    rule_id: string;
    title: string;
    citation: string;
    category: string;
    verdict: string;
    last_completed: string | null;
    next_due: string | null;
    days_remaining: number | null;
    required_action: string;
    frequency_text: string;
  }>;
  evaluated_at: string;
}

export async function fetchComplianceStatus(): Promise<{
  checks: ComplianceCheck[];
  summary: ComplianceResponse["summary"];
}> {
  try {
    const data = await apiFetch<ComplianceResponse>("/api/compliance/status");
    const checks: ComplianceCheck[] = data.evaluations
      .filter((e) => e.verdict !== "not_applicable" && e.verdict !== "info")
      .map((e) => ({
        id: e.rule_id,
        title: e.title,
        category: mapCategory(e.category),
        status: mapVerdict(e.verdict),
        lastCompleted: e.last_completed?.split("T")[0] || null,
        nextDue: e.next_due?.split("T")[0] || "",
        citation: e.citation,
      }));
    return { checks, summary: data.summary };
  } catch {
    return {
      checks: mockChecks,
      summary: {
        total: mockChecks.length,
        passing: mockChecks.filter((c) => c.status === "passing").length,
        warnings: mockChecks.filter((c) => c.status === "warning").length,
        violations: mockChecks.filter((c) => c.status === "overdue").length,
        info: 0,
      },
    };
  }
}

// ── Logbook ─────────────────────────────────────────────

function mapEntryType(t: string): LogbookEntry["type"] {
  if (t === "fuel_dip") return "fuel";
  if (t === "drill" || t === "inspection" || t === "maintenance" || t === "general") {
    return t as LogbookEntry["type"];
  }
  return "general";
}

export async function fetchLogbook(
  type?: string,
  limit = 50,
  offset = 0
): Promise<{ entries: LogbookEntry[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    const data = await apiFetch<{
      entries: Array<{
        id: string;
        entryType: string;
        timestamp: string;
        author: string;
        title: string;
        body: string | null;
      }>;
      total: number;
    }>(`/api/logbook?${params}`);

    const entries: LogbookEntry[] = data.entries.map((e) => ({
      id: e.id,
      date: e.timestamp,
      type: mapEntryType(e.entryType),
      title: e.title,
      author: e.author,
      notes: e.body || undefined,
    }));
    return { entries, total: data.total };
  } catch {
    let entries = mockLogbook;
    if (type) entries = entries.filter((e) => e.type === type);
    return { entries, total: entries.length };
  }
}

// ── Alerts ──────────────────────────────────────────────

function mapSeverity(s: string): Alert["severity"] {
  if (s === "violation") return "critical";
  if (s === "warning") return "warning";
  return "info";
}

export async function fetchAlerts(): Promise<Alert[]> {
  try {
    const data = await apiFetch<{
      alerts: Array<{
        rule_id: string;
        title: string;
        citation: string;
        severity: string;
        days_remaining: number | null;
        next_due: string | null;
        last_completed: string | null;
        required_action: string;
      }>;
      count: number;
    }>("/api/alerts");

    return data.alerts.map((a) => ({
      id: a.rule_id,
      severity: mapSeverity(a.severity),
      title: a.title,
      description: a.required_action,
      dueDate: a.next_due?.split("T")[0],
      createdAt: new Date().toISOString(),
      resolved: false,
    }));
  } catch {
    return mockAlerts;
  }
}

// ── POST logbook entry ──────────────────────────────────

export async function createLogbookEntry(body: {
  entry_type: string;
  title: string;
  body: string;
  author: string;
}): Promise<{ success: boolean; entry_id?: string; error?: string }> {
  try {
    const data = await apiFetch<{ success: boolean; entry_id: string }>(
      "/api/logbook",
      { method: "POST", body: JSON.stringify(body) }
    );
    return data;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ── Log Compliance Completion ────────────────────────────

export async function logComplianceCompletion(ruleId: string, completedBy: string, notes?: string) {
  return apiFetch<{ success: boolean; entry_id: string; completed_at: string }>(
    "/api/compliance/log-completion",
    { method: "POST", body: JSON.stringify({ rule_id: ruleId, completed_by: completedBy, notes }) }
  );
}

// ── Reports ─────────────────────────────────────────────

export async function downloadAuditReport(start: string, end: string): Promise<Blob> {
  const res = await fetch(
    `${BASE_URL}/api/reports/audit?start=${start}&end=${end}`
  );
  if (!res.ok) throw new Error(`Report generation failed: ${res.status}`);
  return res.blob();
}

export async function downloadDrillReport(start: string, end: string): Promise<Blob> {
  const res = await fetch(
    `${BASE_URL}/api/reports/drills?start=${start}&end=${end}`
  );
  if (!res.ok) throw new Error(`Drill report generation failed: ${res.status}`);
  return res.blob();
}

export async function downloadPreDepartureReport(start: string, end: string): Promise<Blob> {
  const res = await fetch(
    `${BASE_URL}/api/reports/pre-departure?start=${start}&end=${end}`
  );
  if (!res.ok) throw new Error(`Pre-departure report generation failed: ${res.status}`);
  return res.blob();
}

// ── Pre-departure items ─────────────────────────────────

export async function getPreDepartureItems(): Promise<PreDepartureItem[]> {
  try {
    const data = await apiFetch<{
      items: Array<{
        id: string;
        label: string;
        citation?: string;
      }>;
    }>("/api/vessel/pre-departure-items");
    return data.items;
  } catch {
    return mockPreDep;
  }
}
