"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createLogbookEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type EntryType = "drill" | "inspection" | "fuel_dip" | "maintenance" | "general";

const entryTypes: { type: EntryType; label: string; icon: string; color: string }[] = [
  { type: "drill", label: "Drill", icon: "D", color: "bg-status-blue" },
  { type: "inspection", label: "Inspection", icon: "I", color: "bg-status-green" },
  { type: "fuel_dip", label: "Fuel Dip", icon: "F", color: "bg-status-amber" },
  { type: "maintenance", label: "Maintenance", icon: "M", color: "bg-slate-muted" },
  { type: "general", label: "General", icon: "G", color: "bg-navy-border" },
];

export default function NewLogbookEntryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<EntryType | null>(null);
  const [author, setAuthor] = useState("");

  // Pre-fill author from logged-in user
  useEffect(() => {
    if (user && !author) {
      setAuthor(user.displayName || user.username);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drill fields
  const [drillTitle, setDrillTitle] = useState("");
  const [crewPresent, setCrewPresent] = useState("");
  const [equipmentTested, setEquipmentTested] = useState("");
  const [drillNotes, setDrillNotes] = useState("");

  // Inspection fields
  const [inspTitle, setInspTitle] = useState("");
  const [condition, setCondition] = useState("satisfactory");
  const [inspNotes, setInspNotes] = useState("");

  // Fuel Dip fields
  const [portTank, setPortTank] = useState("");
  const [starboardTank, setStarboardTank] = useState("");
  const [totalGallons, setTotalGallons] = useState("");
  const [fuelNotes, setFuelNotes] = useState("");

  // Maintenance fields
  const [systemName, setSystemName] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [maintNotes, setMaintNotes] = useState("");

  // General fields
  const [genTitle, setGenTitle] = useState("");
  const [genNotes, setGenNotes] = useState("");

  function buildPayload(): { title: string; body: string } | null {
    if (!selectedType) return null;
    switch (selectedType) {
      case "drill":
        if (!drillTitle.trim()) return null;
        return {
          title: drillTitle.trim(),
          body: [
            crewPresent && `Crew present: ${crewPresent}`,
            equipmentTested && `Equipment tested: ${equipmentTested}`,
            drillNotes && `Notes: ${drillNotes}`,
          ].filter(Boolean).join("\n"),
        };
      case "inspection":
        if (!inspTitle.trim()) return null;
        return {
          title: inspTitle.trim(),
          body: [
            `Condition: ${condition}`,
            inspNotes && `Notes: ${inspNotes}`,
          ].filter(Boolean).join("\n"),
        };
      case "fuel_dip":
        return {
          title: `Fuel Dip — ${totalGallons || "?"} gal total`,
          body: [
            portTank && `Port tank: ${portTank}%`,
            starboardTank && `Starboard tank: ${starboardTank}%`,
            totalGallons && `Total gallons: ${totalGallons}`,
            fuelNotes && `Notes: ${fuelNotes}`,
          ].filter(Boolean).join("\n"),
        };
      case "maintenance":
        if (!systemName.trim()) return null;
        return {
          title: `${systemName.trim()} — ${actionTaken.trim() || "Maintenance"}`,
          body: [
            `System: ${systemName}`,
            actionTaken && `Action taken: ${actionTaken}`,
            nextDueDate && `Next due: ${nextDueDate}`,
            maintNotes && `Notes: ${maintNotes}`,
          ].filter(Boolean).join("\n"),
        };
      case "general":
        if (!genTitle.trim()) return null;
        return {
          title: genTitle.trim(),
          body: genNotes || "",
        };
    }
  }

  async function handleSubmit() {
    const payload = buildPayload();
    if (!payload || !selectedType || !author.trim()) return;

    setSubmitting(true);
    setError(null);

    const result = await createLogbookEntry({
      entry_type: selectedType,
      title: payload.title,
      body: payload.body,
      author: author.trim(),
    });

    if (result.success) {
      router.push("/logbook?saved=1");
    } else {
      setError(result.error || "Failed to save entry. Please try again.");
      setSubmitting(false);
    }
  }

  const payload = buildPayload();
  const canSubmit = !!payload && !!author.trim() && !submitting;

  return (
    <div className="space-y-5 pb-8">
      <h1 className="text-xl font-bold">New Logbook Entry</h1>

      {/* Entry type selector */}
      <section>
        <label className="text-sm font-semibold text-slate-muted uppercase tracking-wider block mb-2">
          Entry Type
        </label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {entryTypes.map((et) => (
            <button
              key={et.type}
              onClick={() => setSelectedType(et.type)}
              className={`flex flex-col items-center gap-2 p-3 rounded-lg min-h-[72px] transition-colors border-2 ${
                selectedType === et.type
                  ? "border-status-blue bg-status-blue/10"
                  : "border-navy-border bg-navy-surface hover:border-slate-muted"
              }`}
            >
              <span className={`w-10 h-10 rounded-full ${et.color} flex items-center justify-center text-sm font-bold text-white`}>
                {et.icon}
              </span>
              <span className="text-xs font-medium">{et.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Type-specific form */}
      {selectedType && (
        <section className="space-y-4">
          {selectedType === "drill" && (
            <>
              <Field label="Title" value={drillTitle} onChange={setDrillTitle} placeholder="e.g., Fire Drill — Engine room scenario" />
              <Field label="Crew Present (count)" value={crewPresent} onChange={setCrewPresent} placeholder="e.g., 8" type="number" />
              <TextArea label="Equipment Tested" value={equipmentTested} onChange={setEquipmentTested} placeholder="Fire pumps, breathing apparatus, etc." />
              <TextArea label="Notes" value={drillNotes} onChange={setDrillNotes} placeholder="Observations, results, issues..." />
            </>
          )}

          {selectedType === "inspection" && (
            <>
              <Field label="Title" value={inspTitle} onChange={setInspTitle} placeholder="e.g., Lifesaving Equipment — Weekly visual check" />
              <div>
                <label className="text-sm text-slate-muted block mb-1">Condition</label>
                <div className="flex gap-2">
                  {(["satisfactory", "needs_attention", "failed"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCondition(c)}
                      className={`flex-1 py-3 rounded-lg text-sm font-medium min-h-[48px] transition-colors ${
                        condition === c
                          ? c === "satisfactory" ? "bg-status-green/20 text-status-green border-2 border-status-green"
                            : c === "needs_attention" ? "bg-status-amber/20 text-status-amber border-2 border-status-amber"
                            : "bg-status-red/20 text-status-red border-2 border-status-red"
                          : "bg-navy-surface text-slate-muted border-2 border-navy-border"
                      }`}
                    >
                      {c === "satisfactory" ? "Satisfactory" : c === "needs_attention" ? "Needs Attention" : "Failed"}
                    </button>
                  ))}
                </div>
              </div>
              <TextArea label="Notes" value={inspNotes} onChange={setInspNotes} placeholder="Details of inspection..." />
            </>
          )}

          {selectedType === "fuel_dip" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Port Tank %" value={portTank} onChange={setPortTank} placeholder="e.g., 78" type="number" />
                <Field label="Starboard Tank %" value={starboardTank} onChange={setStarboardTank} placeholder="e.g., 82" type="number" />
              </div>
              <Field label="Total Gallons" value={totalGallons} onChange={setTotalGallons} placeholder="e.g., 3200" type="number" />
              <TextArea label="Notes" value={fuelNotes} onChange={setFuelNotes} placeholder="Additional observations..." />
            </>
          )}

          {selectedType === "maintenance" && (
            <>
              <Field label="System Name" value={systemName} onChange={setSystemName} placeholder="e.g., Boiler #1" />
              <TextArea label="Action Taken" value={actionTaken} onChange={setActionTaken} placeholder="Describe work performed..." />
              <Field label="Next Due Date" value={nextDueDate} onChange={setNextDueDate} type="date" />
              <TextArea label="Notes" value={maintNotes} onChange={setMaintNotes} placeholder="Additional details..." />
            </>
          )}

          {selectedType === "general" && (
            <>
              <Field label="Title" value={genTitle} onChange={setGenTitle} placeholder="e.g., Steering gear test — pre-departure" />
              <TextArea label="Notes" value={genNotes} onChange={setGenNotes} placeholder="Details..." />
            </>
          )}

          {/* Author */}
          <div>
            <label className="text-sm text-slate-muted block mb-1">Author</label>
            <div className="w-full bg-navy border border-navy-border/50 rounded-lg px-4 py-3 text-sm text-slate-muted min-h-[48px] flex items-center">
              {author || "—"}
            </div>
          </div>
        </section>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-status-red/15 border border-status-red/30 text-status-red text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Submit */}
      {selectedType && (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-lg font-bold text-base min-h-[56px] transition-colors ${
            canSubmit
              ? "bg-status-blue text-white"
              : "bg-navy-surface text-slate-muted cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            "Save Entry"
          )}
        </button>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-sm text-slate-muted block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy-surface border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text placeholder:text-slate-muted/50 min-h-[48px] focus:outline-none focus:border-status-blue"
      />
    </div>
  );
}

function TextArea({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-slate-muted block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-navy-surface border border-navy-border rounded-lg px-4 py-3 text-sm text-slate-text placeholder:text-slate-muted/50 min-h-[80px] focus:outline-none focus:border-status-blue resize-none"
      />
    </div>
  );
}
