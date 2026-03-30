const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((init?.headers as Record<string, string>) || {}),
  };

  // Don't set Content-Type for FormData (multipart)
  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Vessel Admin ─────────────────────────────────────────

export async function fetchAdminVessel() {
  return adminFetch<{ vessel: Record<string, any> }>("/api/admin/vessel");
}

export async function updateAdminVessel(data: Record<string, any>) {
  return adminFetch<{ success: boolean; vessel: Record<string, any> }>("/api/admin/vessel", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function fetchVesselCertificates() {
  return adminFetch<{ certificates: any[] }>("/api/admin/vessel/certificates");
}

export async function updateVesselCertificate(id: string, data: Record<string, any>) {
  return adminFetch<{ success: boolean }>(`/api/admin/vessel/certificates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Crew Admin ───────────────────────────────────────────

export async function fetchCrewList(params?: {
  status?: string;
  role?: string;
  search?: string;
  department?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.role) qs.set("role", params.role);
  if (params?.search) qs.set("search", params.search);
  if (params?.department) qs.set("department", params.department);
  const query = qs.toString();
  return adminFetch<{ crew: any[]; count: number }>(`/api/admin/crew${query ? `?${query}` : ""}`);
}

export async function fetchCrewMember(id: string) {
  return adminFetch<Record<string, any>>(`/api/admin/crew/${id}`);
}

export async function createCrewMember(data: Record<string, any>) {
  return adminFetch<{ success: boolean; profile: any; user: any }>("/api/admin/crew", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCrewMember(id: string, data: Record<string, any>) {
  return adminFetch<{ success: boolean; profile: any }>(`/api/admin/crew/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deactivateCrewMember(id: string) {
  return adminFetch<{ success: boolean }>(`/api/admin/crew/${id}`, {
    method: "DELETE",
  });
}

export async function addCredential(crewId: string, data: Record<string, any>) {
  return adminFetch<{ success: boolean; credential: any }>(`/api/admin/crew/${crewId}/credentials`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCredential(crewId: string, credId: string, data: Record<string, any>) {
  return adminFetch<{ success: boolean; credential: any }>(`/api/admin/crew/${crewId}/credentials/${credId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCredential(crewId: string, credId: string) {
  return adminFetch<{ success: boolean }>(`/api/admin/crew/${crewId}/credentials/${credId}`, {
    method: "DELETE",
  });
}

// ── Rules Admin ──────────────────────────────────────────

export async function fetchRules() {
  return adminFetch<{ rules: any[]; count: number; active_count: number }>("/api/admin/rules");
}

export async function updateRule(ruleId: string, data: Record<string, any>) {
  return adminFetch<{ success: boolean }>(`/api/admin/rules/${encodeURIComponent(ruleId)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// ── Documents Admin ──────────────────────────────────────

export async function fetchDocuments(params?: {
  category?: string;
  crew_profile_id?: string;
  expiry_status?: string;
  search?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set("category", params.category);
  if (params?.crew_profile_id) qs.set("crew_profile_id", params.crew_profile_id);
  if (params?.expiry_status) qs.set("expiry_status", params.expiry_status);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return adminFetch<{ documents: any[]; count: number; summary: { current: number; expiring: number; expired: number } }>(
    `/api/admin/documents${query ? `?${query}` : ""}`,
  );
}

export async function uploadDocument(formData: FormData) {
  return adminFetch<{ success: boolean; document: any }>("/api/admin/documents", {
    method: "POST",
    body: formData,
  });
}

export async function updateDocument(id: string, data: Record<string, any>) {
  return adminFetch<{ success: boolean; document: any }>(`/api/admin/documents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteDocument(id: string) {
  return adminFetch<{ success: boolean }>(`/api/admin/documents/${id}`, {
    method: "DELETE",
  });
}

// ── System Admin ─────────────────────────────────────────

export async function fetchSystemHealth() {
  return adminFetch<Record<string, any>>("/api/admin/system/health");
}

export async function triggerComplianceCheck() {
  return adminFetch<{ success: boolean; message: string }>("/api/admin/system/compliance-check", {
    method: "POST",
  });
}
