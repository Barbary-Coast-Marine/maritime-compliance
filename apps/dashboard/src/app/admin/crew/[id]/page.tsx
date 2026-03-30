"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchCrewMember,
  deactivateCrewMember,
  addCredential,
  deleteCredential,
} from "@/lib/admin-api";

export default function CrewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personal: true,
    assignment: true,
    credentials: true,
    medical: false,
    training: false,
    documents: false,
    activity: false,
  });
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showCredForm, setShowCredForm] = useState(false);
  const [credForm, setCredForm] = useState({
    credential_type: "endorsement",
    title: "",
    credential_number: "",
    issuer: "USCG",
    issue_date: "",
    expiry_date: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadMember = async () => {
    setLoading(true);
    try {
      const data = await fetchCrewMember(id);
      setMember(data);
    } catch {
      setMember(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMember();
  }, [id]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showToast = (msg: string, duration = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(""), duration);
  };

  const handleDeactivate = async () => {
    try {
      await deactivateCrewMember(id);
      showToast("Crew member deactivated");
      setShowDeactivateConfirm(false);
      router.push("/admin/crew");
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
  };

  const handleAddCredential = async () => {
    if (!credForm.title || !credForm.credential_type) {
      showToast("Title and type are required");
      return;
    }
    setSubmitting(true);
    try {
      await addCredential(id, credForm);
      showToast("Credential added");
      setShowCredForm(false);
      setCredForm({
        credential_type: "endorsement",
        title: "",
        credential_number: "",
        issuer: "USCG",
        issue_date: "",
        expiry_date: "",
      });
      await loadMember();
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
    setSubmitting(false);
  };

  const handleDeleteCredential = async (credId: string) => {
    try {
      await deleteCredential(id, credId);
      showToast("Credential removed");
      await loadMember();
    } catch (err) {
      showToast(`Error: ${(err as Error).message}`, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-slate-muted/30 border-t-slate-muted rounded-full animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center text-slate-muted py-20">
        <p className="mb-4">Crew member not found</p>
        <Link href="/admin/crew" className="text-status-blue hover:underline text-sm">
          Back to Roster
        </Link>
      </div>
    );
  }

  const now = new Date();
  const credentials: any[] = member.credentials || [];
  const documents: any[] = member.documents || [];

  const statusStyles: Record<string, string> = {
    active: "bg-status-green/20 text-status-green",
    pending: "bg-status-amber/20 text-status-amber",
    inactive: "bg-status-red/20 text-status-red",
    archived: "bg-slate-muted/20 text-slate-muted",
  };

  // Group credentials by type
  const uscgCreds = credentials.filter((c) =>
    ["mmc", "license", "endorsement", "twic", "stcw"].includes(c.credentialType),
  );
  const medicalCreds = credentials.filter((c) =>
    ["medical_cert", "drug_test"].includes(c.credentialType),
  );
  const trainingCreds = credentials.filter((c) =>
    ["bst", "firefighting", "first_aid", "survival_craft", "safety_orientation", "custom"].includes(
      c.credentialType,
    ),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[member.status] || statusStyles.pending}`}
              >
                {member.status}
              </span>
              <span className="text-xs text-slate-muted">
                {member.user?.role || (member.isVolunteer ? "volunteer" : "crew")}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-text">
              {member.firstName} {member.lastName}
            </h1>
            {member.preferredName && (
              <p className="text-sm text-slate-muted">"{member.preferredName}"</p>
            )}
            <div className="flex gap-3 mt-2 text-xs text-slate-muted">
              {member.department && <span>{member.department}</span>}
              {member.watchAssignment && <span>{member.watchAssignment}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/crew/${id}/edit`}
              className="bg-navy border border-navy-border hover:border-status-blue/50 text-slate-text rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            >
              Edit
            </Link>
            {member.status !== "inactive" && (
              <button
                onClick={() => setShowDeactivateConfirm(true)}
                className="bg-navy border border-navy-border hover:border-status-red/50 text-status-red rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                Deactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Back link */}
      <Link href="/admin/crew" className="text-status-blue hover:underline text-sm">
        &larr; Back to Roster
      </Link>

      {/* Personal Information */}
      <CollapsibleSection
        title="Personal Information"
        expanded={expandedSections.personal}
        onToggle={() => toggleSection("personal")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoRow label="Full Name" value={`${member.firstName} ${member.middleName ? member.middleName + " " : ""}${member.lastName}`} />
          {member.preferredName && <InfoRow label="Preferred Name" value={member.preferredName} />}
          <InfoRow label="Email" value={member.email} />
          {member.phone && <InfoRow label="Phone" value={member.phone} />}
          {member.dateOfBirth && <InfoRow label="Date of Birth" value={member.dateOfBirth} />}
          {(member.addressLine1 || member.city) && (
            <InfoRow
              label="Address"
              value={[member.addressLine1, member.addressLine2, member.city, member.state, member.zip]
                .filter(Boolean)
                .join(", ")}
            />
          )}
        </div>
        {member.emergencyContactName && (
          <>
            <h4 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mt-4 mb-2">
              Emergency Contact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow label="Name" value={member.emergencyContactName} />
              {member.emergencyContactRelationship && (
                <InfoRow label="Relationship" value={member.emergencyContactRelationship} />
              )}
              {member.emergencyContactPhone && (
                <InfoRow label="Phone" value={member.emergencyContactPhone} />
              )}
            </div>
          </>
        )}
        {member.nextOfKinName && (
          <>
            <h4 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mt-4 mb-2">
              Next of Kin
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoRow label="Name" value={member.nextOfKinName} />
              {member.nextOfKinRelationship && (
                <InfoRow label="Relationship" value={member.nextOfKinRelationship} />
              )}
              {member.nextOfKinPhone && <InfoRow label="Phone" value={member.nextOfKinPhone} />}
            </div>
          </>
        )}
      </CollapsibleSection>

      {/* Assignment */}
      <CollapsibleSection
        title="Assignment"
        expanded={expandedSections.assignment}
        onToggle={() => toggleSection("assignment")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoRow label="Track" value={member.isVolunteer ? "Volunteer" : "Licensed Mariner"} />
          <InfoRow label="Role" value={member.user?.role || "—"} />
          <InfoRow label="Department" value={member.department || "—"} />
          {member.watchAssignment && <InfoRow label="Watch" value={member.watchAssignment} />}
          {member.startDate && <InfoRow label="Start Date" value={member.startDate} />}
        </div>
      </CollapsibleSection>

      {/* USCG Credentials */}
      <CollapsibleSection
        title="USCG Credentials"
        expanded={expandedSections.credentials}
        onToggle={() => toggleSection("credentials")}
        count={uscgCreds.length}
      >
        {uscgCreds.length === 0 ? (
          <p className="text-sm text-slate-muted py-2">
            {member.isVolunteer ? "Not required for volunteers" : "No credentials on file"}
          </p>
        ) : (
          <div className="space-y-2">
            {uscgCreds.map((cred) => (
              <CredentialRow
                key={cred.id}
                credential={cred}
                now={now}
                onDelete={() => handleDeleteCredential(cred.id)}
              />
            ))}
          </div>
        )}

        {/* Add Credential Form */}
        {showCredForm ? (
          <div className="mt-3 bg-navy rounded-lg p-3 border border-navy-border space-y-3">
            <h4 className="text-xs font-semibold text-slate-muted uppercase tracking-wider">
              Add Credential
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-muted mb-1">Type</label>
                <select
                  className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                  value={credForm.credential_type}
                  onChange={(e) => setCredForm((p) => ({ ...p, credential_type: e.target.value }))}
                >
                  <option value="mmc">MMC</option>
                  <option value="license">License</option>
                  <option value="endorsement">Endorsement</option>
                  <option value="twic">TWIC</option>
                  <option value="stcw">STCW</option>
                  <option value="medical_cert">Medical Cert</option>
                  <option value="drug_test">Drug Test</option>
                  <option value="bst">BST</option>
                  <option value="firefighting">Firefighting</option>
                  <option value="first_aid">First Aid/CPR</option>
                  <option value="survival_craft">Survival Craft</option>
                  <option value="custom">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-muted mb-1">Title</label>
                <input
                  type="text"
                  className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                  value={credForm.title}
                  onChange={(e) => setCredForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Master 1600 GRT"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-muted mb-1">Number</label>
                <input
                  type="text"
                  className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                  value={credForm.credential_number}
                  onChange={(e) =>
                    setCredForm((p) => ({ ...p, credential_number: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs text-slate-muted mb-1">Issuer</label>
                <input
                  type="text"
                  className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                  value={credForm.issuer}
                  onChange={(e) => setCredForm((p) => ({ ...p, issuer: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-muted mb-1">Issue Date</label>
                <input
                  type="date"
                  className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                  value={credForm.issue_date}
                  onChange={(e) => setCredForm((p) => ({ ...p, issue_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-muted mb-1">Expiry Date</label>
                <input
                  type="date"
                  className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                  value={credForm.expiry_date}
                  onChange={(e) => setCredForm((p) => ({ ...p, expiry_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddCredential}
                disabled={submitting}
                className="bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-4 py-2 text-sm font-medium min-h-[40px] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Saving..." : "Save Credential"}
              </button>
              <button
                onClick={() => setShowCredForm(false)}
                className="bg-navy-surface border border-navy-border text-slate-text rounded-lg px-4 py-2 text-sm min-h-[40px] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCredForm(true)}
            className="mt-3 w-full border border-dashed border-navy-border text-slate-muted rounded-lg p-3 min-h-[48px] hover:border-status-blue/50 hover:text-status-blue transition-colors text-sm"
          >
            + Add Credential
          </button>
        )}
      </CollapsibleSection>

      {/* Medical */}
      <CollapsibleSection
        title="Medical"
        expanded={expandedSections.medical}
        onToggle={() => toggleSection("medical")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <InfoRow
            label="Fit for Duty"
            value={member.fitForDuty ? "Yes" : "No"}
            valueClass={member.fitForDuty ? "text-status-green" : "text-status-red"}
          />
          {member.allergies && <InfoRow label="Allergies" value={member.allergies} />}
        </div>
        {medicalCreds.length > 0 && (
          <div className="mt-3 space-y-2">
            {medicalCreds.map((cred) => (
              <CredentialRow key={cred.id} credential={cred} now={now} onDelete={() => handleDeleteCredential(cred.id)} />
            ))}
          </div>
        )}
        {member.medicalNotes && (
          <div className="mt-3 p-3 bg-navy rounded-lg border border-navy-border">
            <span className="text-xs text-slate-muted">Notes (confidential)</span>
            <p className="text-sm text-slate-text mt-1">{member.medicalNotes}</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Training */}
      <CollapsibleSection
        title="Training Record"
        expanded={expandedSections.training}
        onToggle={() => toggleSection("training")}
        count={trainingCreds.length}
      >
        {trainingCreds.length === 0 ? (
          <p className="text-sm text-slate-muted py-2">No training records on file</p>
        ) : (
          <div className="space-y-2">
            {trainingCreds.map((cred) => (
              <CredentialRow key={cred.id} credential={cred} now={now} onDelete={() => handleDeleteCredential(cred.id)} />
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Documents */}
      <CollapsibleSection
        title="Documents"
        expanded={expandedSections.documents}
        onToggle={() => toggleSection("documents")}
        count={documents.length}
      >
        {documents.length === 0 ? (
          <p className="text-sm text-slate-muted py-2">No documents uploaded</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-navy rounded-lg border border-navy-border"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-text truncate">
                    {doc.filename}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-muted">{doc.docType}</span>
                    {doc.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-blue/20 text-status-blue">
                        {doc.category}
                      </span>
                    )}
                  </div>
                </div>
                {doc.expiryDate && <ExpiryBadge expiryDate={doc.expiryDate} now={now} />}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Activity Log */}
      <CollapsibleSection
        title="Activity Log"
        expanded={expandedSections.activity}
        onToggle={() => toggleSection("activity")}
      >
        <p className="text-sm text-slate-muted py-2">
          Activity log will be available in a future update.
        </p>
      </CollapsibleSection>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-navy-surface border border-navy-border rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-text mb-2">Deactivate Crew Member</h3>
            <p className="text-sm text-slate-muted mb-4">
              Are you sure you want to deactivate{" "}
              <strong className="text-slate-text">
                {member.firstName} {member.lastName}
              </strong>
              ? Their login will be disabled and they will be marked inactive.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateConfirm(false)}
                className="flex-1 bg-navy border border-navy-border text-slate-text rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors hover:border-slate-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="flex-1 bg-status-red hover:bg-status-red/80 text-white rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-slate-text shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────

function CollapsibleSection({
  title,
  expanded,
  onToggle,
  count,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-navy-surface border border-navy-border rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">
            {title}
          </h2>
          {count !== undefined && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-status-blue/20 text-status-blue">
              {count}
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-slate-muted transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <span className="text-xs text-slate-muted">{label}</span>
      <p className={`text-sm ${valueClass || "text-slate-text"}`}>{value || "—"}</p>
    </div>
  );
}

function CredentialRow({
  credential,
  now,
  onDelete,
}: {
  credential: any;
  now: Date;
  onDelete: () => void;
}) {
  const typeLabels: Record<string, string> = {
    mmc: "MMC",
    license: "License",
    endorsement: "Endorsement",
    twic: "TWIC",
    stcw: "STCW",
    medical_cert: "Medical Cert",
    drug_test: "Drug Test",
    bst: "BST",
    firefighting: "Firefighting",
    first_aid: "First Aid/CPR",
    survival_craft: "Survival Craft",
    safety_orientation: "Safety Orientation",
    custom: "Other",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-navy rounded-lg border border-navy-border">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-muted/20 text-slate-muted">
            {typeLabels[credential.credentialType] || credential.credentialType}
          </span>
          <span className="text-sm font-medium text-slate-text truncate">
            {credential.title}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-muted">
          {credential.credentialNumber && <span>#{credential.credentialNumber}</span>}
          {credential.issuer && <span>{credential.issuer}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        {credential.expiryDate ? (
          <ExpiryBadge expiryDate={credential.expiryDate} now={now} />
        ) : (
          <span className="text-xs text-slate-muted">No expiry</span>
        )}
        <button
          onClick={onDelete}
          className="text-slate-muted hover:text-status-red text-xs ml-1 transition-colors"
          title="Remove"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ExpiryBadge({ expiryDate, now }: { expiryDate: string; now: Date }) {
  const expiry = new Date(expiryDate);
  const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let colorClass: string;
  let label: string;
  if (days < 0) {
    colorClass = "bg-status-red/20 text-status-red";
    label = `${Math.abs(days)}d overdue`;
  } else if (days <= 30) {
    colorClass = "bg-status-red/20 text-status-red";
    label = `${days}d`;
  } else if (days <= 90) {
    colorClass = "bg-status-amber/20 text-status-amber";
    label = `${days}d`;
  } else {
    colorClass = "bg-status-green/20 text-status-green";
    label = `${days}d`;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
