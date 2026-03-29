// Mock data for the M/V O'Brien — Subchapter T small passenger vessel

export const vessel = {
  name: "M/V O'Brien",
  imo: "9876543",
  hailingPort: "San Francisco, CA",
  type: "Small Passenger Vessel",
  subchapter: "T",
  grossTonnage: 92,
  passengerCapacity: 149,
  coiNumber: "COI-2024-SF-00847",
  coiExpiry: "2026-08-15",
  drydockDue: "2027-01-20",
  lastDrydock: "2025-01-20",
};

export type ComplianceStatus = "passing" | "warning" | "overdue";
export type CheckCategory = "drills" | "inspections" | "certificates" | "pre_departure";

export interface ComplianceCheck {
  id: string;
  title: string;
  category: CheckCategory;
  status: ComplianceStatus;
  lastCompleted: string | null;
  nextDue: string;
  citation: string;
}

export const complianceChecks: ComplianceCheck[] = [
  // Drills
  {
    id: "drill-abandon-ship",
    title: "Abandon Ship Drill",
    category: "drills",
    status: "passing",
    lastCompleted: "2026-03-22",
    nextDue: "2026-04-05",
    citation: "46 CFR 185.520(a)",
  },
  {
    id: "drill-fire",
    title: "Fire Drill",
    category: "drills",
    status: "warning",
    lastCompleted: "2026-03-15",
    nextDue: "2026-03-31",
    citation: "46 CFR 185.520(b)",
  },
  {
    id: "drill-immersion-suit",
    title: "Immersion Suit Drill",
    category: "drills",
    status: "passing",
    lastCompleted: "2026-03-01",
    nextDue: "2026-06-01",
    citation: "46 CFR 185.520(d)",
  },
  {
    id: "drill-man-overboard",
    title: "Man Overboard Drill",
    category: "drills",
    status: "passing",
    lastCompleted: "2026-03-22",
    nextDue: "2026-04-05",
    citation: "46 CFR 185.524",
  },

  // Inspections
  {
    id: "insp-lifesaving",
    title: "Lifesaving Equipment Inspection",
    category: "inspections",
    status: "passing",
    lastCompleted: "2026-03-20",
    nextDue: "2026-04-20",
    citation: "46 CFR 185.512",
  },
  {
    id: "insp-fire-extinguisher",
    title: "Fire Extinguisher Inspection",
    category: "inspections",
    status: "overdue",
    lastCompleted: "2026-02-15",
    nextDue: "2026-03-15",
    citation: "46 CFR 181.400",
  },
  {
    id: "insp-epirb",
    title: "EPIRB Battery & Registration Check",
    category: "inspections",
    status: "passing",
    lastCompleted: "2026-03-01",
    nextDue: "2026-09-01",
    citation: "46 CFR 180.68",
  },
  {
    id: "insp-emergency-lighting",
    title: "Emergency Lighting Test",
    category: "inspections",
    status: "warning",
    lastCompleted: "2026-03-10",
    nextDue: "2026-03-31",
    citation: "46 CFR 183.432",
  },

  // Certificates
  {
    id: "cert-coi",
    title: "Certificate of Inspection (COI)",
    category: "certificates",
    status: "passing",
    lastCompleted: "2024-08-15",
    nextDue: "2026-08-15",
    citation: "46 CFR 176.100",
  },
  {
    id: "cert-drydock",
    title: "Drydock Examination",
    category: "certificates",
    status: "passing",
    lastCompleted: "2025-01-20",
    nextDue: "2027-01-20",
    citation: "46 CFR 176.600",
  },
  {
    id: "cert-stability",
    title: "Stability Letter Validity",
    category: "certificates",
    status: "passing",
    lastCompleted: "2024-08-15",
    nextDue: "2026-08-15",
    citation: "46 CFR 178.210",
  },
  {
    id: "cert-fcc",
    title: "FCC Radio Station License",
    category: "certificates",
    status: "warning",
    lastCompleted: "2021-04-10",
    nextDue: "2026-04-10",
    citation: "47 CFR 80.13",
  },

  // Pre-departure
  {
    id: "predep-steering",
    title: "Steering Gear Test",
    category: "pre_departure",
    status: "passing",
    lastCompleted: "2026-03-29",
    nextDue: "2026-03-30",
    citation: "46 CFR 185.516(a)",
  },
  {
    id: "predep-manifest",
    title: "Passenger Manifest Filed",
    category: "pre_departure",
    status: "passing",
    lastCompleted: "2026-03-29",
    nextDue: "2026-03-30",
    citation: "46 CFR 185.502",
  },
  {
    id: "predep-stability",
    title: "Stability Check (per trim book)",
    category: "pre_departure",
    status: "passing",
    lastCompleted: "2026-03-29",
    nextDue: "2026-03-30",
    citation: "46 CFR 178.310",
  },
];

export interface LogbookEntry {
  id: string;
  date: string;
  type: "drill" | "inspection" | "fuel" | "maintenance" | "general";
  title: string;
  author: string;
  notes?: string;
}

export const logbookEntries: LogbookEntry[] = [
  {
    id: "log-1",
    date: "2026-03-29T08:15:00",
    type: "fuel",
    title: "Morning Fuel Dip — 78% capacity",
    author: "Capt. Rodriguez",
    notes: "Port: 340 gal, Starboard: 355 gal. Total 695 gal.",
  },
  {
    id: "log-2",
    date: "2026-03-28T14:30:00",
    type: "maintenance",
    title: "Bilge Pump #2 — Replaced impeller",
    author: "Eng. Chen",
    notes: "Old impeller worn. Spare used from stores. Reorder needed.",
  },
  {
    id: "log-3",
    date: "2026-03-27T09:00:00",
    type: "drill",
    title: "Abandon Ship Drill — All crew participated",
    author: "Capt. Rodriguez",
    notes: "6 crew, 45 passengers aboard. Muster time: 3m 12s. Satisfactory.",
  },
  {
    id: "log-4",
    date: "2026-03-26T16:00:00",
    type: "inspection",
    title: "Lifesaving Equipment — Weekly check",
    author: "1st Mate Davis",
    notes: "All PFDs accounted for. Ring buoys serviceable. EPIRB green.",
  },
  {
    id: "log-5",
    date: "2026-03-25T07:45:00",
    type: "fuel",
    title: "Morning Fuel Dip — 85% capacity",
    author: "Capt. Rodriguez",
  },
  {
    id: "log-6",
    date: "2026-03-24T11:00:00",
    type: "drill",
    title: "Fire Drill — Engine room scenario",
    author: "Capt. Rodriguez",
    notes: "Simulated engine room fire. Crew response good. Extinguisher use practiced.",
  },
  {
    id: "log-7",
    date: "2026-03-23T10:00:00",
    type: "general",
    title: "Port-side handrail repair noted",
    author: "1st Mate Davis",
    notes: "Loose mounting bracket on upper deck port rail. Scheduled for repair.",
  },
  {
    id: "log-8",
    date: "2026-03-22T09:00:00",
    type: "drill",
    title: "Man Overboard Drill",
    author: "Capt. Rodriguez",
    notes: "Oscar deployed. Recovery in 4m 22s. Reviewed procedure with new crew.",
  },
  {
    id: "log-9",
    date: "2026-03-20T14:00:00",
    type: "inspection",
    title: "Fire Extinguisher Monthly Check",
    author: "Eng. Chen",
    notes: "All extinguishers tagged and charged. #7 gauge reading low — replaced.",
  },
  {
    id: "log-10",
    date: "2026-03-18T08:00:00",
    type: "maintenance",
    title: "Engine oil change — Main engine",
    author: "Eng. Chen",
    notes: "Drained and replaced with 15W-40. Filter replaced. Hours: 4,822.",
  },
];

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  dueDate?: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export const alerts: Alert[] = [
  {
    id: "alert-1",
    severity: "critical",
    title: "Fire Extinguisher Inspection Overdue",
    description:
      "Monthly fire extinguisher inspection was due March 15. Now 14 days overdue. Required by 46 CFR 181.400.",
    dueDate: "2026-03-15",
    createdAt: "2026-03-16T00:00:00",
    resolved: false,
  },
  {
    id: "alert-2",
    severity: "warning",
    title: "Fire Drill Due in 2 Days",
    description:
      "Biweekly fire drill due March 31. Last completed March 15. Per 46 CFR 185.520(b).",
    dueDate: "2026-03-31",
    createdAt: "2026-03-29T00:00:00",
    resolved: false,
  },
  {
    id: "alert-3",
    severity: "warning",
    title: "Emergency Lighting Test Due Soon",
    description:
      "Monthly emergency lighting test due March 31. Per 46 CFR 183.432.",
    dueDate: "2026-03-31",
    createdAt: "2026-03-28T00:00:00",
    resolved: false,
  },
  {
    id: "alert-4",
    severity: "warning",
    title: "FCC Radio License Expiring",
    description:
      "FCC Radio Station License expires April 10, 2026. Renewal required per 47 CFR 80.13.",
    dueDate: "2026-04-10",
    createdAt: "2026-03-25T00:00:00",
    resolved: false,
  },
  {
    id: "alert-5",
    severity: "critical",
    title: "Bilge Pump #2 Failure",
    description:
      "Bilge pump #2 impeller failed during routine check. Immediate replacement required.",
    createdAt: "2026-03-27T10:00:00",
    resolved: true,
    resolvedAt: "2026-03-28T14:30:00",
  },
  {
    id: "alert-6",
    severity: "warning",
    title: "Abandon Ship Drill Completed",
    description: "Biweekly abandon ship drill was due March 22. Completed on time.",
    dueDate: "2026-03-22",
    createdAt: "2026-03-20T00:00:00",
    resolved: true,
    resolvedAt: "2026-03-22T09:00:00",
  },
  {
    id: "alert-7",
    severity: "info",
    title: "COI Renewal — 5 months remaining",
    description:
      "Certificate of Inspection expires August 15, 2026. Begin renewal process by June.",
    dueDate: "2026-08-15",
    createdAt: "2026-03-15T00:00:00",
    resolved: true,
    resolvedAt: "2026-03-15T08:00:00",
  },
];

export interface PreDepartureItem {
  id: string;
  label: string;
  citation?: string;
}

export const preDepartureItems: PreDepartureItem[] = [
  { id: "pd-1", label: "Steering gear tested", citation: "46 CFR 185.516(a)" },
  { id: "pd-2", label: "Whistle / horn tested", citation: "33 CFR 83.33" },
  { id: "pd-3", label: "Engine room communication verified", citation: "46 CFR 185.516(c)" },
  { id: "pd-4", label: "Passenger manifest filed with count", citation: "46 CFR 185.502" },
  { id: "pd-5", label: "Stability verified per trim book", citation: "46 CFR 178.310" },
  { id: "pd-6", label: "Hatches and openings secured", citation: "46 CFR 185.516" },
  { id: "pd-7", label: "Safety equipment ready and accessible", citation: "46 CFR 180.25" },
  { id: "pd-8", label: "Weather reviewed for route", citation: "46 CFR 185.504" },
  { id: "pd-9", label: "Crew briefing completed" },
];
