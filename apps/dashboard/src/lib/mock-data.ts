// Mock data for the MY Dragon Lady — Subchapter H passenger vessel

export const vessel = {
  name: "MY Dragon Lady",
  imo: "5171749",
  mmsi: "366879000",
  callSign: "KXCH",
  absClass: "4304713",
  hailingPort: "San Francisco, CA",
  type: "Passenger Vessel (Museum Ship)",
  subchapter: "H",
  grossTonnage: 7176,
  displacement: 15928,
  lengthFt: 441.5,
  yearBuilt: 1943,
  propulsion: "Triple-expansion steam, 2,500 HP",
  coiNumber: "COI-2025-SF-JOB",
  coiExpiry: "2027-06-01",
  drydockDue: "2028-09-15",
  lastDrydock: "2023-09-15",
  operator: "National Liberty Ship Memorial (NLSM)",
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
    citation: "46 CFR 78.37",
  },
  {
    id: "drill-fire",
    title: "Fire Drill",
    category: "drills",
    status: "warning",
    lastCompleted: "2026-03-15",
    nextDue: "2026-03-31",
    citation: "46 CFR 78.37",
  },
  {
    id: "drill-immersion-suit",
    title: "Immersion Suit Drill",
    category: "drills",
    status: "passing",
    lastCompleted: "2026-03-01",
    nextDue: "2026-06-01",
    citation: "46 CFR 78.37",
  },
  {
    id: "drill-man-overboard",
    title: "Man Overboard Drill",
    category: "drills",
    status: "passing",
    lastCompleted: "2026-03-22",
    nextDue: "2026-04-05",
    citation: "46 CFR 78.37",
  },

  // Inspections
  {
    id: "insp-lifesaving-weekly",
    title: "Lifesaving Equipment — Weekly Visual",
    category: "inspections",
    status: "passing",
    lastCompleted: "2026-03-27",
    nextDue: "2026-04-03",
    citation: "46 CFR 78.77",
  },
  {
    id: "insp-lifesaving-monthly",
    title: "Lifesaving Equipment — Monthly Detailed",
    category: "inspections",
    status: "passing",
    lastCompleted: "2026-03-01",
    nextDue: "2026-04-01",
    citation: "46 CFR 78.77",
  },
  {
    id: "insp-fire-extinguisher",
    title: "Fire Extinguisher Annual Inspection",
    category: "inspections",
    status: "overdue",
    lastCompleted: "2025-03-10",
    nextDue: "2026-03-10",
    citation: "46 CFR 78.67",
  },
  {
    id: "insp-epirb",
    title: "EPIRB Monthly Test",
    category: "inspections",
    status: "passing",
    lastCompleted: "2026-03-01",
    nextDue: "2026-04-01",
    citation: "46 CFR 78.77",
  },
  {
    id: "insp-emergency-lighting",
    title: "Emergency Lighting & Power Test",
    category: "inspections",
    status: "warning",
    lastCompleted: "2026-03-22",
    nextDue: "2026-03-29",
    citation: "46 CFR 78.73",
  },
  {
    id: "insp-boiler",
    title: "Boiler Internal Inspection (Steam)",
    category: "inspections",
    status: "passing",
    lastCompleted: "2025-11-15",
    nextDue: "2026-11-15",
    citation: "46 CFR Part 52",
  },

  // Certificates
  {
    id: "cert-coi",
    title: "Certificate of Inspection",
    category: "certificates",
    status: "passing",
    lastCompleted: "2022-06-01",
    nextDue: "2027-06-01",
    citation: "46 CFR 71.25",
  },
  {
    id: "cert-drydock",
    title: "Drydock Examination",
    category: "certificates",
    status: "passing",
    lastCompleted: "2023-09-15",
    nextDue: "2028-09-15",
    citation: "46 CFR 71.50",
  },
  {
    id: "cert-stability",
    title: "Stability Letter",
    category: "certificates",
    status: "passing",
    lastCompleted: "2022-06-01",
    nextDue: "2027-06-01",
    citation: "46 CFR 78.53",
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
  {
    id: "cert-liferaft",
    title: "Inflatable Liferaft Servicing",
    category: "certificates",
    status: "passing",
    lastCompleted: "2025-12-01",
    nextDue: "2026-12-01",
    citation: "46 CFR 78.83",
  },

  // Pre-departure
  {
    id: "predep-steering",
    title: "Steering Gear & Whistle Test",
    category: "pre_departure",
    status: "passing",
    lastCompleted: "2026-03-29",
    nextDue: "2026-03-30",
    citation: "46 CFR 78.47",
  },
  {
    id: "predep-manifest",
    title: "Passenger Manifest Filed",
    category: "pre_departure",
    status: "passing",
    lastCompleted: "2026-03-29",
    nextDue: "2026-03-30",
    citation: "46 CFR 78.33",
  },
  {
    id: "predep-stability",
    title: "Stability Verification",
    category: "pre_departure",
    status: "passing",
    lastCompleted: "2026-03-29",
    nextDue: "2026-03-30",
    citation: "46 CFR 78.53",
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
    author: "C/E Jon Eaton",
    notes: "Port: 1,560 gal, Starboard: 1,640 gal. Total 3,200 gal (80%).",
  },
  {
    id: "log-2",
    date: "2026-03-28T14:30:00",
    type: "maintenance",
    title: "Boiler #1 — Safety valve test satisfactory",
    author: "C/E Jon Eaton",
    notes: "Both Foster Wheeler boilers tested. Lifting pressure within spec.",
  },
  {
    id: "log-3",
    date: "2026-03-27T09:00:00",
    type: "drill",
    title: "Fire Drill — Engine room scenario",
    author: "Capt. Cevan Lesieur",
    notes: "8 crew participated. Simulated engine room fire. Fire pumps #1 and #2 tested. Breathing apparatus demonstrated. Satisfactory.",
  },
  {
    id: "log-4",
    date: "2026-03-27T15:00:00",
    type: "inspection",
    title: "Lifesaving Equipment — Weekly visual check",
    author: "Bob Jarvis",
    notes: "All PFDs accounted for. Ring buoys serviceable. Lifeboat engine run 3 min ahead/astern. EPIRB green.",
  },
  {
    id: "log-5",
    date: "2026-03-26T07:45:00",
    type: "fuel",
    title: "Morning Fuel Dip — 85% capacity",
    author: "C/E Jon Eaton",
  },
  {
    id: "log-6",
    date: "2026-03-25T10:00:00",
    type: "general",
    title: "Steering gear test — pre-departure",
    author: "Capt. Cevan Lesieur",
    notes: "Steering gear, whistle, and engine room communication all satisfactory. Logged per 46 CFR 78.47.",
  },
  {
    id: "log-7",
    date: "2026-03-22T09:00:00",
    type: "drill",
    title: "Abandon Ship Drill — All hands",
    author: "Capt. Cevan Lesieur",
    notes: "8 crew present. General alarm sounded. Mustered at survival craft stations. Lifejackets donned and inspected. Lifeboat #2 lowered to embarkation deck. Satisfactory.",
  },
  {
    id: "log-8",
    date: "2026-03-22T09:45:00",
    type: "drill",
    title: "Man Overboard Drill",
    author: "Capt. Cevan Lesieur",
    notes: "Oscar deployed. Recovery in 4m 22s. Reviewed procedure with new volunteer crew.",
  },
  {
    id: "log-9",
    date: "2026-03-20T14:00:00",
    type: "inspection",
    title: "Emergency Lighting — Weekly test",
    author: "C/E Jon Eaton",
    notes: "Emergency lighting and power systems tested. All operational. Emergency generator run under load 15 min.",
  },
  {
    id: "log-10",
    date: "2026-03-15T09:00:00",
    type: "drill",
    title: "Fire Drill — Galley scenario",
    author: "Capt. Cevan Lesieur",
    notes: "Simulated galley fire. 6 crew participated. Ventilation secured, fire pumps started, portable extinguisher deployed. Satisfactory.",
  },
];

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  detail?: string;
  dueDate?: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export const alerts: Alert[] = [
  {
    id: "alert-1",
    severity: "critical",
    title: "Fire Extinguisher Annual Inspection Overdue",
    description:
      "Annual fire extinguisher inspection was due March 10, 2026. Now 19 days overdue. Required by 46 CFR 78.67. Schedule inspection immediately.",
    dueDate: "2026-03-10",
    createdAt: "2026-03-11T00:00:00",
    resolved: false,
  },
  {
    id: "alert-2",
    severity: "warning",
    title: "Fire Drill Due in 2 Days",
    description:
      "Weekly fire drill due March 31. Last completed March 15. Per 46 CFR 78.37.",
    dueDate: "2026-03-31",
    createdAt: "2026-03-29T00:00:00",
    resolved: false,
  },
  {
    id: "alert-3",
    severity: "warning",
    title: "Emergency Lighting Test Due Today",
    description:
      "Weekly emergency lighting and power test due March 29. Per 46 CFR 78.73.",
    dueDate: "2026-03-29",
    createdAt: "2026-03-28T00:00:00",
    resolved: false,
  },
  {
    id: "alert-4",
    severity: "warning",
    title: "FCC Radio License Expiring",
    description:
      "FCC Radio Station License (KXCH) expires April 10, 2026. Renewal required per 47 CFR 80.13.",
    dueDate: "2026-04-10",
    createdAt: "2026-03-25T00:00:00",
    resolved: false,
  },
  {
    id: "alert-5",
    severity: "info",
    title: "Boiler Inspection — 8 Months Remaining",
    description:
      "Annual boiler internal inspection due November 15, 2026. Per 46 CFR Part 52. Schedule with USCG marine inspector.",
    dueDate: "2026-11-15",
    createdAt: "2026-03-15T00:00:00",
    resolved: true,
    resolvedAt: "2026-03-15T08:00:00",
  },
  {
    id: "alert-6",
    severity: "warning",
    title: "Abandon Ship Drill Completed",
    description: "Weekly abandon ship drill completed on time March 22. Per 46 CFR 78.37.",
    dueDate: "2026-03-22",
    createdAt: "2026-03-20T00:00:00",
    resolved: true,
    resolvedAt: "2026-03-22T09:00:00",
  },
  {
    id: "alert-7",
    severity: "info",
    title: "COI Valid — 15 Months Remaining",
    description:
      "Certificate of Inspection expires June 1, 2027. No action needed yet.",
    dueDate: "2027-06-01",
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
  { id: "pd-1", label: "Steering gear tested", citation: "46 CFR 78.47" },
  { id: "pd-2", label: "Whistle tested", citation: "46 CFR 78.47" },
  { id: "pd-3", label: "Engine room communication verified", citation: "46 CFR 78.47" },
  { id: "pd-4", label: "Passenger manifest filed with full names", citation: "46 CFR 78.33" },
  { id: "pd-5", label: "Stability verified per trim book", citation: "46 CFR 78.53" },
  { id: "pd-6", label: "Hatches and openings secured", citation: "46 CFR 78.50" },
  { id: "pd-7", label: "Lifesaving equipment ready and accessible", citation: "46 CFR 78.77" },
  { id: "pd-8", label: "Weather reviewed for route" },
  { id: "pd-9", label: "Crew briefing completed" },
];
