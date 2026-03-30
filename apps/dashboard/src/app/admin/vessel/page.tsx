"use client";

import { useEffect, useState } from "react";
import { fetchAdminVessel, updateAdminVessel, fetchVesselCertificates } from "@/lib/admin-api";

export default function VesselProfilePage() {
  const [vessel, setVessel] = useState<Record<string, any> | null>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    Promise.all([
      fetchAdminVessel().catch(() => null),
      fetchVesselCertificates().catch(() => ({ certificates: [] })),
    ]).then(([vesselData, certData]) => {
      if (vesselData?.vessel) {
        setVessel(vesselData.vessel);
        setForm(vesselData.vessel);
      }
      setCertificates(certData?.certificates || []);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdminVessel({
        name: form.name,
        imo_number: form.imoNumber,
        vessel_type: form.vesselType,
        flag_state: form.flagState,
        gross_tonnage: form.grossTonnage ? Number(form.grossTonnage) : null,
        year_built: form.yearBuilt ? Number(form.yearBuilt) : null,
        coi_date: form.coiDate || null,
        coi_expiry: form.coiExpiry || null,
        last_drydock: form.lastDrydock || null,
      });
      setToast("Vessel profile saved");
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      setToast(`Error: ${(err as Error).message}`);
      setTimeout(() => setToast(""), 5000);
    }
    setSaving(false);
  };

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  if (!vessel) {
    return <div className="text-center text-slate-muted py-20">No vessel configured</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
        <h1 className="text-xl font-bold text-slate-text">{form.name || "Vessel Profile"}</h1>
        <div className="flex gap-2 mt-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-status-blue/20 text-status-blue">
            {form.vesselType || "Unknown"}
          </span>
          <span className="text-sm text-slate-muted">
            IMO {form.imoNumber || "—"} | {form.flagState || "—"}
          </span>
        </div>
      </div>

      {/* Identity Section */}
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
        <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mb-3">
          Vessel Identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Vessel Name" value={form.name || ""} onChange={(v) => updateField("name", v)} required />
          <FormField label="IMO Number" value={form.imoNumber || ""} onChange={(v) => updateField("imoNumber", v)} />
          <FormField label="MMSI" value={form.mmsi || ""} onChange={(v) => updateField("mmsi", v)} />
          <FormField label="Call Sign" value={form.callSign || ""} onChange={(v) => updateField("callSign", v)} />
          <FormField label="Official Number" value={form.officialNumber || ""} onChange={(v) => updateField("officialNumber", v)} />
          <div>
            <label className="block text-sm text-slate-muted mb-1">Vessel Type</label>
            <select
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px] focus:border-status-blue focus:ring-1 focus:ring-status-blue"
              value={form.vesselType || ""}
              onChange={(e) => updateField("vesselType", e.target.value)}
            >
              <option value="passenger">Passenger</option>
              <option value="small_passenger">Small Passenger</option>
              <option value="cargo">Cargo</option>
              <option value="tanker">Tanker</option>
              <option value="towing">Towing</option>
              <option value="offshore_supply">Offshore Supply</option>
              <option value="fishing">Fishing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FormField label="Flag State" value={form.flagState || ""} onChange={(v) => updateField("flagState", v)} />
          <FormField label="Hailing Port" value={form.hailingPort || ""} onChange={(v) => updateField("hailingPort", v)} />
          <FormField label="Gross Tonnage" value={form.grossTonnage || ""} onChange={(v) => updateField("grossTonnage", v)} type="number" />
          <FormField label="Year Built" value={form.yearBuilt || ""} onChange={(v) => updateField("yearBuilt", v)} type="number" />
          <FormField label="Propulsion" value={form.propulsion || ""} onChange={(v) => updateField("propulsion", v)} />
          <FormField label="Operator" value={form.operator || ""} onChange={(v) => updateField("operator", v)} />
        </div>
      </div>

      {/* COI & Key Dates */}
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
        <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mb-3">
          Key Dates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="COI Issue Date" value={form.coiDate || ""} onChange={(v) => updateField("coiDate", v)} type="date" />
          <FormField label="COI Expiry Date" value={form.coiExpiry || ""} onChange={(v) => updateField("coiExpiry", v)} type="date" />
          <FormField label="Last Drydock" value={form.lastDrydock || ""} onChange={(v) => updateField("lastDrydock", v)} type="date" />
        </div>
      </div>

      {/* Certificate Timeline */}
      {certificates.length > 0 && (
        <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
          <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mb-3">
            Certificate Timeline
          </h2>
          <div className="space-y-3">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-3 bg-navy rounded-lg border border-navy-border"
              >
                <div>
                  <div className="text-sm font-medium text-slate-text">{cert.filename}</div>
                  <div className="text-xs text-slate-muted">{cert.docType}</div>
                </div>
                <ExpiryBadge days={cert.daysUntilExpiry} status={cert.expiryStatus} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="sticky bottom-20 z-10">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-6 py-3 min-h-[48px] font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-slate-text shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-muted mb-1">
        {label}
        {required && <span className="text-status-red ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px] focus:border-status-blue focus:ring-1 focus:ring-status-blue"
        required={required}
      />
    </div>
  );
}

function ExpiryBadge({ days, status }: { days: number | null; status: string }) {
  if (days === null) return <span className="text-xs text-slate-muted">No expiry</span>;

  const colors: Record<string, string> = {
    current: "bg-status-green/20 text-status-green",
    warning: "bg-status-amber/20 text-status-amber",
    critical: "bg-status-red/20 text-status-red",
    expired: "bg-status-red/20 text-status-red",
  };

  const label = days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || colors.current}`}>
      {label}
    </span>
  );
}
