"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCrewMember } from "@/lib/admin-api";

const MARINER_ROLES = [
  "Captain", "Chief Mate", "2nd Mate", "3rd Mate",
  "Chief Engineer", "1st AE", "2nd AE", "3rd AE",
  "AB", "OS", "QMED", "Wiper", "Steward",
];
const VOLUNTEER_ROLES = [
  "Deck Volunteer", "Engine Volunteer", "Education/Tour Guide", "Admin/Office", "General Volunteer",
];
const DEPARTMENTS = ["deck", "engine", "steward", "admin"];
const LICENSE_GRADES = [
  "Master", "Chief Mate", "2nd Mate", "3rd Mate",
  "Chief Engineer", "1st AE", "2nd AE", "3rd AE",
  "AB", "OS", "QMED", "Wiper",
];

interface WizardData {
  // Step 1: Personal
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  next_of_kin_name: string;
  next_of_kin_relationship: string;
  next_of_kin_phone: string;
  next_of_kin_address: string;
  // Step 2: Assignment
  is_volunteer: boolean;
  role: string;
  department: string;
  watch_assignment: string;
  start_date: string;
  // Step 3: Credentials
  credentials: Array<{
    credential_type: string;
    title: string;
    credential_number: string;
    grade: string;
    issuer: string;
    issue_date: string;
    expiry_date: string;
  }>;
  // Step 4: Medical
  fit_for_duty: boolean;
  medical_notes: string;
  allergies: string;
  medical_cert_issuer: string;
  medical_cert_issue_date: string;
  medical_cert_expiry_date: string;
  drug_test_date: string;
  drug_test_status: string;
  physical_exam_date: string;
  self_certification: boolean;
  // Step 5: Training
  training: Array<{
    credential_type: string;
    title: string;
    issue_date: string;
    expiry_date: string;
  }>;
  safety_orientation_date: string;
  tshirt_size: string;
  badge_issued: boolean;
  // Step 7: Review flags
  captain_signoff: boolean;
}

const defaultData: WizardData = {
  first_name: "", middle_name: "", last_name: "", preferred_name: "",
  email: "", phone: "", date_of_birth: "",
  address_line1: "", address_line2: "", city: "", state: "", zip: "",
  emergency_contact_name: "", emergency_contact_relationship: "", emergency_contact_phone: "",
  next_of_kin_name: "", next_of_kin_relationship: "", next_of_kin_phone: "", next_of_kin_address: "",
  is_volunteer: false, role: "", department: "deck", watch_assignment: "",
  start_date: new Date().toISOString().split("T")[0],
  credentials: [],
  fit_for_duty: true, medical_notes: "", allergies: "",
  medical_cert_issuer: "", medical_cert_issue_date: "", medical_cert_expiry_date: "",
  drug_test_date: "", drug_test_status: "", physical_exam_date: "",
  self_certification: false,
  training: [],
  safety_orientation_date: "", tshirt_size: "", badge_issued: false,
  captain_signoff: false,
};

export default function CrewOnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(defaultData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const isVolunteer = data.is_volunteer;

  // Volunteer skips step 3 (credentials) and has simplified step 4 & 5
  const allSteps = isVolunteer
    ? [1, 2, 4, 5, 7]
    : [1, 2, 3, 4, 5, 6, 7];
  const stepLabels: Record<number, string> = {
    1: "Personal", 2: "Role", 3: "Credentials", 4: "Medical",
    5: "Training", 6: "Documents", 7: "Review",
  };

  const currentStepIndex = allSteps.indexOf(step);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < allSteps.length - 1;

  const goNext = () => {
    if (canGoForward) setStep(allSteps[currentStepIndex + 1]);
  };
  const goBack = () => {
    if (canGoBack) setStep(allSteps[currentStepIndex - 1]);
  };

  const update = (field: string, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const addCredential = () => {
    setData((prev) => ({
      ...prev,
      credentials: [
        ...prev.credentials,
        { credential_type: "endorsement", title: "", credential_number: "", grade: "", issuer: "USCG", issue_date: "", expiry_date: "" },
      ],
    }));
  };

  const updateCredential = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const creds = [...prev.credentials];
      creds[idx] = { ...creds[idx], [field]: value };
      return { ...prev, credentials: creds };
    });
  };

  const removeCredential = (idx: number) => {
    setData((prev) => ({
      ...prev,
      credentials: prev.credentials.filter((_, i) => i !== idx),
    }));
  };

  const addTraining = () => {
    setData((prev) => ({
      ...prev,
      training: [...prev.training, { credential_type: "custom", title: "", issue_date: "", expiry_date: "" }],
    }));
  };

  const updateTraining = (idx: number, field: string, value: string) => {
    setData((prev) => {
      const t = [...prev.training];
      t[idx] = { ...t[idx], [field]: value };
      return { ...prev, training: t };
    });
  };

  const removeTraining = (idx: number) => {
    setData((prev) => ({
      ...prev,
      training: prev.training.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (status: "active" | "pending") => {
    setSubmitting(true);
    setError("");

    // Gather all credentials: from step 3 + medical certs + training certs
    const allCredentials: any[] = [...data.credentials];

    // Medical cert (mariner)
    if (!isVolunteer && data.medical_cert_expiry_date) {
      allCredentials.push({
        credential_type: "medical_cert",
        title: "Medical Certificate",
        issuer: data.medical_cert_issuer || "Maritime Medical",
        issue_date: data.medical_cert_issue_date,
        expiry_date: data.medical_cert_expiry_date,
      });
    }

    // Drug test
    if (data.drug_test_date) {
      allCredentials.push({
        credential_type: "drug_test",
        title: "Drug Test",
        issue_date: data.drug_test_date,
        status: data.drug_test_status || "pass",
      });
    }

    // Training items
    for (const t of data.training) {
      if (t.title) {
        allCredentials.push({
          credential_type: t.credential_type,
          title: t.title,
          issue_date: t.issue_date,
          expiry_date: t.expiry_date,
        });
      }
    }

    // Safety orientation for volunteers
    if (isVolunteer && data.safety_orientation_date) {
      allCredentials.push({
        credential_type: "safety_orientation",
        title: "Ship Safety Orientation",
        issuer: "SS Jeremiah O'Brien",
        issue_date: data.safety_orientation_date,
      });
    }

    try {
      const res = await createCrewMember({
        personal: {
          first_name: data.first_name,
          middle_name: data.middle_name || undefined,
          last_name: data.last_name,
          preferred_name: data.preferred_name || undefined,
          email: data.email,
          phone: data.phone || undefined,
          date_of_birth: data.date_of_birth || undefined,
          address_line1: data.address_line1 || undefined,
          address_line2: data.address_line2 || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zip: data.zip || undefined,
          emergency_contact_name: data.emergency_contact_name || undefined,
          emergency_contact_relationship: data.emergency_contact_relationship || undefined,
          emergency_contact_phone: data.emergency_contact_phone || undefined,
          next_of_kin_name: data.next_of_kin_name || undefined,
          next_of_kin_relationship: data.next_of_kin_relationship || undefined,
          next_of_kin_phone: data.next_of_kin_phone || undefined,
          next_of_kin_address: data.next_of_kin_address || undefined,
        },
        assignment: {
          role: data.role || "crew",
          department: data.department,
          watch_assignment: data.watch_assignment || undefined,
          start_date: data.start_date,
          is_volunteer: data.is_volunteer,
        },
        credentials: allCredentials.length > 0 ? allCredentials : undefined,
        medical: {
          fit_for_duty: data.fit_for_duty,
          medical_notes: data.medical_notes || undefined,
          allergies: data.allergies || undefined,
        },
        volunteer: isVolunteer
          ? {
              tshirt_size: data.tshirt_size || undefined,
              badge_issued: data.badge_issued,
              safety_orientation_date: data.safety_orientation_date || undefined,
            }
          : undefined,
        status,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    }
    setSubmitting(false);
  };

  // Success screen
  if (result) {
    return (
      <div className="space-y-4">
        <div className="bg-navy-surface border border-navy-border rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">&#x2705;</div>
          <h2 className="text-lg font-bold text-slate-text mb-2">Crew Member Onboarded</h2>
          <p className="text-sm text-slate-muted mb-4">
            {data.first_name} {data.last_name} has been added to the roster.
          </p>
          <div className="bg-navy rounded-lg p-4 text-left mb-4">
            <p className="text-sm text-slate-muted">Login credentials:</p>
            <p className="text-sm text-slate-text font-mono mt-1">
              Username: <strong>{result.user?.username}</strong>
            </p>
            <p className="text-sm text-slate-text font-mono">
              Temp Password: <strong>{result.user?.tempPassword}</strong>
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/admin/crew")}
              className="bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-6 py-3 min-h-[48px] font-medium transition-colors"
            >
              Back to Roster
            </button>
            <button
              onClick={() => router.push(`/admin/crew/${result.profile?.id}`)}
              className="bg-navy-surface border border-navy-border hover:border-status-blue/50 text-slate-text rounded-lg px-6 py-3 min-h-[48px] font-medium transition-colors"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-text">Onboard New Crew</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {allSteps.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              s === step
                ? "bg-status-blue text-white"
                : i < currentStepIndex
                  ? "bg-status-blue/20 text-status-blue"
                  : "bg-navy-surface text-slate-muted"
            }`}
          >
            {i + 1}. {stepLabels[s]}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
        {step === 1 && <Step1Personal data={data} update={update} />}
        {step === 2 && <Step2Assignment data={data} update={update} />}
        {step === 3 && (
          <Step3Credentials
            data={data}
            addCredential={addCredential}
            updateCredential={updateCredential}
            removeCredential={removeCredential}
          />
        )}
        {step === 4 && <Step4Medical data={data} update={update} isVolunteer={isVolunteer} />}
        {step === 5 && (
          <Step5Training
            data={data}
            update={update}
            isVolunteer={isVolunteer}
            addTraining={addTraining}
            updateTraining={updateTraining}
            removeTraining={removeTraining}
          />
        )}
        {step === 6 && <Step6Documents />}
        {step === 7 && <Step7Review data={data} isVolunteer={isVolunteer} update={update} />}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-status-red/20 border border-status-red/30 rounded-lg p-3 text-sm text-status-red">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {canGoBack && (
          <button
            onClick={goBack}
            className="flex-1 bg-navy-surface border border-navy-border text-slate-text rounded-lg px-6 py-3 min-h-[48px] font-medium transition-colors hover:border-status-blue/50"
          >
            Back
          </button>
        )}
        {step === allSteps[allSteps.length - 1] ? (
          <div className="flex-1 flex gap-2">
            <button
              onClick={() => handleSubmit("pending")}
              disabled={submitting}
              className="flex-1 bg-navy-surface border border-navy-border text-slate-text rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors hover:border-status-blue/50 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit("active")}
              disabled={submitting || !data.captain_signoff}
              className="flex-1 bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-4 py-3 min-h-[48px] font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Complete Onboarding"}
            </button>
          </div>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 bg-status-blue hover:bg-status-blue/80 text-white rounded-lg px-6 py-3 min-h-[48px] font-medium transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step Components ──────────────────────────────────────

function WizardField({
  label, value, onChange, type = "text", required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-muted mb-1">
        {label}{required && <span className="text-status-red ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px] focus:border-status-blue focus:ring-1 focus:ring-status-blue"
      />
    </div>
  );
}

function Step1Personal({ data, update }: { data: WizardData; update: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardField label="First Name" value={data.first_name} onChange={(v) => update("first_name", v)} required />
        <WizardField label="Middle Name" value={data.middle_name} onChange={(v) => update("middle_name", v)} />
        <WizardField label="Last Name" value={data.last_name} onChange={(v) => update("last_name", v)} required />
        <WizardField label="Preferred Name" value={data.preferred_name} onChange={(v) => update("preferred_name", v)} />
        <WizardField label="Email" value={data.email} onChange={(v) => update("email", v)} type="email" required />
        <WizardField label="Phone" value={data.phone} onChange={(v) => update("phone", v)} type="tel" />
        <WizardField label="Date of Birth" value={data.date_of_birth} onChange={(v) => update("date_of_birth", v)} type="date" />
      </div>

      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mt-6">Address</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardField label="Street Address" value={data.address_line1} onChange={(v) => update("address_line1", v)} />
        <WizardField label="Apt/Suite" value={data.address_line2} onChange={(v) => update("address_line2", v)} />
        <WizardField label="City" value={data.city} onChange={(v) => update("city", v)} />
        <WizardField label="State" value={data.state} onChange={(v) => update("state", v)} />
        <WizardField label="ZIP" value={data.zip} onChange={(v) => update("zip", v)} />
      </div>

      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mt-6">Emergency Contact</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardField label="Name" value={data.emergency_contact_name} onChange={(v) => update("emergency_contact_name", v)} required />
        <WizardField label="Relationship" value={data.emergency_contact_relationship} onChange={(v) => update("emergency_contact_relationship", v)} />
        <WizardField label="Phone" value={data.emergency_contact_phone} onChange={(v) => update("emergency_contact_phone", v)} type="tel" required />
      </div>

      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mt-6">Next of Kin</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardField label="Name" value={data.next_of_kin_name} onChange={(v) => update("next_of_kin_name", v)} />
        <WizardField label="Relationship" value={data.next_of_kin_relationship} onChange={(v) => update("next_of_kin_relationship", v)} />
        <WizardField label="Phone" value={data.next_of_kin_phone} onChange={(v) => update("next_of_kin_phone", v)} type="tel" />
      </div>
    </div>
  );
}

function Step2Assignment({ data, update }: { data: WizardData; update: (f: string, v: any) => void }) {
  const roles = data.is_volunteer ? VOLUNTEER_ROLES : MARINER_ROLES;

  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Track</h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { update("is_volunteer", false); update("role", ""); }}
          className={`p-4 rounded-xl border text-center transition-colors min-h-[48px] ${
            !data.is_volunteer
              ? "border-status-blue bg-status-blue/10 text-status-blue"
              : "border-navy-border bg-navy text-slate-muted hover:border-slate-muted/50"
          }`}
        >
          <div className="font-medium">Licensed Mariner</div>
          <div className="text-xs mt-1 opacity-70">Full credentialing</div>
        </button>
        <button
          onClick={() => { update("is_volunteer", true); update("role", ""); }}
          className={`p-4 rounded-xl border text-center transition-colors min-h-[48px] ${
            data.is_volunteer
              ? "border-status-blue bg-status-blue/10 text-status-blue"
              : "border-navy-border bg-navy text-slate-muted hover:border-slate-muted/50"
          }`}
        >
          <div className="font-medium">Volunteer</div>
          <div className="text-xs mt-1 opacity-70">Simplified onboarding</div>
        </button>
      </div>

      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold mt-6">Assignment</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-muted mb-1">Role</label>
          <select
            className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px] focus:border-status-blue"
            value={data.role}
            onChange={(e) => update("role", e.target.value)}
          >
            <option value="">Select role...</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-muted mb-1">Department</label>
          <select
            className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px] focus:border-status-blue"
            value={data.department}
            onChange={(e) => update("department", e.target.value)}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>
        <WizardField label="Watch Assignment" value={data.watch_assignment} onChange={(v) => update("watch_assignment", v)} placeholder="e.g., Day Watch" />
        <WizardField label="Start Date" value={data.start_date} onChange={(v) => update("start_date", v)} type="date" />
      </div>
    </div>
  );
}

function Step3Credentials({
  data, addCredential, updateCredential, removeCredential,
}: {
  data: WizardData;
  addCredential: () => void;
  updateCredential: (i: number, f: string, v: string) => void;
  removeCredential: (i: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">USCG Credentials</h3>

      {/* MMC shortcut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardField
          label="MMC Number"
          value={data.credentials.find((c) => c.credential_type === "mmc")?.credential_number || ""}
          onChange={(v) => {
            const idx = data.credentials.findIndex((c) => c.credential_type === "mmc");
            if (idx >= 0) {
              updateCredential(idx, "credential_number", v);
            } else {
              // Auto-create MMC entry
              const newCreds = [...data.credentials, { credential_type: "mmc", title: "Merchant Mariner Credential", credential_number: v, grade: "", issuer: "USCG", issue_date: "", expiry_date: "" }];
              // Directly set via data since we need to add a new entry
              addCredential();
              // Update the last added credential
              setTimeout(() => {
                updateCredential(data.credentials.length, "credential_type", "mmc");
                updateCredential(data.credentials.length, "title", "Merchant Mariner Credential");
                updateCredential(data.credentials.length, "credential_number", v);
                updateCredential(data.credentials.length, "issuer", "USCG");
              }, 0);
            }
          }}
        />
        <div>
          <label className="block text-sm text-slate-muted mb-1">License Grade</label>
          <select
            className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px] focus:border-status-blue"
            value={data.credentials.find((c) => c.credential_type === "license")?.grade || ""}
            onChange={() => {}}
          >
            <option value="">Select grade...</option>
            {LICENSE_GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Credential list */}
      {data.credentials.map((cred, idx) => (
        <div key={idx} className="bg-navy rounded-lg p-3 border border-navy-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-muted uppercase">{cred.credential_type || "Credential"}</span>
            <button onClick={() => removeCredential(idx)} className="text-status-red text-xs hover:underline">Remove</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-muted mb-1">Type</label>
              <select
                className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-slate-text min-h-[40px]"
                value={cred.credential_type}
                onChange={(e) => updateCredential(idx, "credential_type", e.target.value)}
              >
                <option value="mmc">MMC</option>
                <option value="license">License</option>
                <option value="endorsement">Endorsement</option>
                <option value="twic">TWIC</option>
                <option value="stcw">STCW</option>
              </select>
            </div>
            <WizardField label="Title" value={cred.title} onChange={(v) => updateCredential(idx, "title", v)} />
            <WizardField label="Number" value={cred.credential_number} onChange={(v) => updateCredential(idx, "credential_number", v)} />
            <WizardField label="Issuer" value={cred.issuer} onChange={(v) => updateCredential(idx, "issuer", v)} />
            <WizardField label="Issue Date" value={cred.issue_date} onChange={(v) => updateCredential(idx, "issue_date", v)} type="date" />
            <WizardField label="Expiry Date" value={cred.expiry_date} onChange={(v) => updateCredential(idx, "expiry_date", v)} type="date" />
          </div>
        </div>
      ))}

      <button
        onClick={addCredential}
        className="w-full border border-dashed border-navy-border text-slate-muted rounded-lg p-3 min-h-[48px] hover:border-status-blue/50 hover:text-status-blue transition-colors text-sm"
      >
        + Add Credential
      </button>
    </div>
  );
}

function Step4Medical({ data, update, isVolunteer }: { data: WizardData; update: (f: string, v: any) => void; isVolunteer: boolean }) {
  if (isVolunteer) {
    return (
      <div className="space-y-4">
        <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Medical (Volunteer)</h3>
        <label className="flex items-start gap-3 p-4 bg-navy rounded-lg border border-navy-border cursor-pointer">
          <input
            type="checkbox"
            checked={data.self_certification}
            onChange={(e) => update("self_certification", e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-status-blue"
          />
          <div>
            <div className="text-sm text-slate-text font-medium">Self-Certification</div>
            <div className="text-xs text-slate-muted mt-1">
              I confirm I am physically able to perform assigned duties aboard the vessel.
            </div>
          </div>
        </label>
        <div className="grid grid-cols-1 gap-4">
          <WizardField label="Allergies (optional)" value={data.allergies} onChange={(v) => update("allergies", v)} />
          <WizardField label="Medical Notes (optional, confidential)" value={data.medical_notes} onChange={(v) => update("medical_notes", v)} />
          <WizardField label="Date of Last Physical (optional)" value={data.physical_exam_date} onChange={(v) => update("physical_exam_date", v)} type="date" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Medical</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardField label="Medical Cert Issuer" value={data.medical_cert_issuer} onChange={(v) => update("medical_cert_issuer", v)} />
        <WizardField label="Medical Cert Issue Date" value={data.medical_cert_issue_date} onChange={(v) => update("medical_cert_issue_date", v)} type="date" />
        <WizardField label="Medical Cert Expiry" value={data.medical_cert_expiry_date} onChange={(v) => update("medical_cert_expiry_date", v)} type="date" />
        <div>
          <label className="block text-sm text-slate-muted mb-1">Fit for Duty</label>
          <select
            className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px]"
            value={data.fit_for_duty ? "yes" : "no"}
            onChange={(e) => update("fit_for_duty", e.target.value === "yes")}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <WizardField label="Drug Test Date" value={data.drug_test_date} onChange={(v) => update("drug_test_date", v)} type="date" />
        <div>
          <label className="block text-sm text-slate-muted mb-1">Drug Test Status</label>
          <select
            className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px]"
            value={data.drug_test_status}
            onChange={(e) => update("drug_test_status", e.target.value)}
          >
            <option value="">Not completed</option>
            <option value="pass">Pass</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <WizardField label="Physical Exam Date" value={data.physical_exam_date} onChange={(v) => update("physical_exam_date", v)} type="date" />
      </div>
      <WizardField label="Allergies / Restrictions" value={data.allergies} onChange={(v) => update("allergies", v)} />
      <WizardField label="Medical Notes (confidential)" value={data.medical_notes} onChange={(v) => update("medical_notes", v)} />
    </div>
  );
}

function Step5Training({
  data, update, isVolunteer, addTraining, updateTraining, removeTraining,
}: {
  data: WizardData; update: (f: string, v: any) => void; isVolunteer: boolean;
  addTraining: () => void; updateTraining: (i: number, f: string, v: string) => void; removeTraining: (i: number) => void;
}) {
  if (isVolunteer) {
    return (
      <div className="space-y-4">
        <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Volunteer Orientation</h3>
        <WizardField label="Safety Orientation Date" value={data.safety_orientation_date} onChange={(v) => update("safety_orientation_date", v)} type="date" required />
        <div>
          <label className="block text-sm text-slate-muted mb-1">T-Shirt Size</label>
          <select
            className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-slate-text min-h-[48px]"
            value={data.tshirt_size}
            onChange={(e) => update("tshirt_size", e.target.value)}
          >
            <option value="">Select...</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="2XL">2XL</option>
            <option value="3XL">3XL</option>
          </select>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={data.badge_issued}
            onChange={(e) => update("badge_issued", e.target.checked)}
            className="w-5 h-5 rounded accent-status-blue"
          />
          <span className="text-sm text-slate-text">Badge issued</span>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Training & Certifications</h3>

      {/* Pre-set training items */}
      {[
        { type: "bst", title: "Basic Safety Training (BST)" },
        { type: "firefighting", title: "Advanced Firefighting" },
        { type: "first_aid", title: "Medical First Aid / CPR" },
        { type: "survival_craft", title: "Proficiency in Survival Craft" },
      ].map((preset) => {
        const existing = data.training.find((t) => t.credential_type === preset.type);
        const idx = data.training.findIndex((t) => t.credential_type === preset.type);
        return (
          <div key={preset.type} className="bg-navy rounded-lg p-3 border border-navy-border">
            <div className="text-sm font-medium text-slate-text mb-2">{preset.title}</div>
            <div className="grid grid-cols-2 gap-3">
              <WizardField
                label="Date"
                value={existing?.issue_date || ""}
                onChange={(v) => {
                  if (idx >= 0) {
                    updateTraining(idx, "issue_date", v);
                  } else {
                    addTraining();
                    setTimeout(() => {
                      const newIdx = data.training.length;
                      updateTraining(newIdx, "credential_type", preset.type);
                      updateTraining(newIdx, "title", preset.title);
                      updateTraining(newIdx, "issue_date", v);
                    }, 0);
                  }
                }}
                type="date"
              />
              <WizardField
                label="Expiry"
                value={existing?.expiry_date || ""}
                onChange={(v) => {
                  if (idx >= 0) {
                    updateTraining(idx, "expiry_date", v);
                  }
                }}
                type="date"
              />
            </div>
          </div>
        );
      })}

      {/* Custom training entries */}
      {data.training
        .filter((t) => !["bst", "firefighting", "first_aid", "survival_craft"].includes(t.credential_type))
        .map((t, i) => {
          const realIdx = data.training.indexOf(t);
          return (
            <div key={realIdx} className="bg-navy rounded-lg p-3 border border-navy-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-muted">Additional Training</span>
                <button onClick={() => removeTraining(realIdx)} className="text-status-red text-xs hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <WizardField label="Title" value={t.title} onChange={(v) => updateTraining(realIdx, "title", v)} />
                <WizardField label="Date" value={t.issue_date} onChange={(v) => updateTraining(realIdx, "issue_date", v)} type="date" />
                <WizardField label="Expiry" value={t.expiry_date} onChange={(v) => updateTraining(realIdx, "expiry_date", v)} type="date" />
              </div>
            </div>
          );
        })}

      <button
        onClick={() => { addTraining(); }}
        className="w-full border border-dashed border-navy-border text-slate-muted rounded-lg p-3 min-h-[48px] hover:border-status-blue/50 hover:text-status-blue transition-colors text-sm"
      >
        + Add Training
      </button>
    </div>
  );
}

function Step6Documents() {
  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Documents</h3>
      <div className="text-center py-8 text-slate-muted">
        <p className="text-sm mb-2">Document upload will be available after creating the crew profile.</p>
        <p className="text-xs">You can upload documents from the crew member detail page.</p>
      </div>
    </div>
  );
}

function Step7Review({ data, isVolunteer, update }: { data: WizardData; isVolunteer: boolean; update: (f: string, v: any) => void }) {
  const missingFields: string[] = [];
  if (!data.first_name) missingFields.push("First Name");
  if (!data.last_name) missingFields.push("Last Name");
  if (!data.email) missingFields.push("Email");
  if (!data.emergency_contact_name) missingFields.push("Emergency Contact Name");
  if (!data.emergency_contact_phone) missingFields.push("Emergency Contact Phone");

  return (
    <div className="space-y-4">
      <h3 className="text-slate-muted text-xs uppercase tracking-wider font-semibold">Review</h3>

      {missingFields.length > 0 && (
        <div className="bg-status-amber/20 border border-status-amber/30 rounded-lg p-3">
          <div className="text-sm font-medium text-status-amber mb-1">Missing required fields:</div>
          <ul className="text-xs text-status-amber list-disc list-inside">
            {missingFields.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}

      {/* Personal Summary */}
      <ReviewSection title="Personal">
        <ReviewRow label="Name" value={`${data.first_name} ${data.middle_name ? data.middle_name + " " : ""}${data.last_name}`} />
        {data.preferred_name && <ReviewRow label="Preferred Name" value={data.preferred_name} />}
        <ReviewRow label="Email" value={data.email} />
        {data.phone && <ReviewRow label="Phone" value={data.phone} />}
        {data.date_of_birth && <ReviewRow label="Date of Birth" value={data.date_of_birth} />}
        <ReviewRow label="Emergency Contact" value={`${data.emergency_contact_name} (${data.emergency_contact_relationship}) ${data.emergency_contact_phone}`} />
      </ReviewSection>

      {/* Assignment */}
      <ReviewSection title="Assignment">
        <ReviewRow label="Track" value={isVolunteer ? "Volunteer" : "Licensed Mariner"} />
        <ReviewRow label="Role" value={data.role || "—"} />
        <ReviewRow label="Department" value={data.department} />
        <ReviewRow label="Start Date" value={data.start_date} />
      </ReviewSection>

      {/* Credentials */}
      {!isVolunteer && data.credentials.length > 0 && (
        <ReviewSection title={`Credentials (${data.credentials.length})`}>
          {data.credentials.map((c, i) => (
            <ReviewRow key={i} label={c.credential_type} value={`${c.title}${c.credential_number ? ` #${c.credential_number}` : ""}${c.expiry_date ? ` (exp: ${c.expiry_date})` : ""}`} />
          ))}
        </ReviewSection>
      )}

      {/* Medical */}
      <ReviewSection title="Medical">
        <ReviewRow label="Fit for Duty" value={data.fit_for_duty ? "Yes" : "No"} />
        {data.allergies && <ReviewRow label="Allergies" value={data.allergies} />}
      </ReviewSection>

      {/* Captain Sign-off */}
      <label className="flex items-start gap-3 p-4 bg-navy rounded-lg border border-navy-border cursor-pointer">
        <input
          type="checkbox"
          checked={data.captain_signoff}
          onChange={(e) => update("captain_signoff", e.target.checked)}
          className="mt-1 w-5 h-5 rounded accent-status-blue"
        />
        <div>
          <div className="text-sm text-slate-text font-medium">Captain Sign-off</div>
          <div className="text-xs text-slate-muted mt-1">
            I confirm this crew member has been properly onboarded and all information is accurate.
          </div>
        </div>
      </label>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy rounded-lg p-3 border border-navy-border">
      <div className="text-xs font-semibold text-slate-muted uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-muted">{label}</span>
      <span className="text-slate-text text-right">{value || "—"}</span>
    </div>
  );
}
