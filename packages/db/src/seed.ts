import { createDb, vessels, users, logbookEntries } from "./index";
import crypto from "node:crypto";

const db = createDb();

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (idempotent re-seed)
  await db.delete(logbookEntries);
  await db.delete(users);
  await db.delete(vessels);

  // Insert SS Jeremiah O'Brien
  const [vessel] = await db
    .insert(vessels)
    .values({
      name: "SS Jeremiah O'Brien",
      imoNumber: "5171749",
      vesselType: "passenger",
      flagState: "US",
      grossTonnage: "7176.00",
      yearBuilt: 1943,
      coiExpiry: "2027-06-01",
      lastDrydock: "2023-09-15",
      complianceStatus: "warning",
    })
    .returning();

  console.log(`  Vessel created: ${vessel.name} (${vessel.id})`);

  // Create default admin user (SHA-256 placeholder — use bcrypt in production)
  const passwordHash = crypto.createHash("sha256").update("admin123").digest("hex");

  const [user] = await db
    .insert(users)
    .values({
      username: "admin",
      passwordHash,
      role: "captain",
      vesselId: vessel.id,
    })
    .returning();

  console.log(`  User created: ${user.username} (${user.role})`);

  // Seed 10 logbook entries matching mock data
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const entries = [
    {
      vesselId: vessel.id,
      entryType: "drill" as const,
      timestamp: daysAgo(2),
      author: "Capt. Cevan Lesieur",
      title: "Fire Drill",
      body: "Weekly fire drill conducted. All crew mustered at stations. Fire pumps tested, hose outlets operational. Breathing apparatus demonstrated. Watertight doors cycled. All hands accounted for.",
    },
    {
      vesselId: vessel.id,
      entryType: "drill" as const,
      timestamp: daysAgo(2),
      author: "Capt. Cevan Lesieur",
      title: "Abandon Ship Drill",
      body: "Abandon ship drill conducted concurrently with fire drill. Passengers mustered at survival craft stations. Lifejackets checked. Lifeboat #1 swung out to embarkation deck.",
    },
    {
      vesselId: vessel.id,
      entryType: "inspection" as const,
      timestamp: daysAgo(5),
      author: "Bob Jarvis",
      title: "Lifesaving Equipment Weekly Inspection",
      body: "Visual inspection of all lifesaving appliances. Lifebuoys secure, lights functional. Lifejacket stowage checked. EPIRB mounting secure. No deficiencies noted.",
    },
    {
      vesselId: vessel.id,
      entryType: "inspection" as const,
      timestamp: daysAgo(12),
      author: "Bob Jarvis",
      title: "Lifesaving Equipment Monthly Inspection",
      body: "Detailed monthly inspection of lifesaving appliances per 46 CFR 78.77. Lifeboat equipment checked against manufacturer checklist. EPIRB test circuit activated — operational. SART tested — operational. All equipment in good order.",
    },
    {
      vesselId: vessel.id,
      entryType: "maintenance" as const,
      timestamp: daysAgo(3),
      author: "C/E Jon Eaton",
      title: "Boiler Safety Valve Test",
      body: "Main boiler safety valves tested at operating pressure. Port valve lifted at 220 PSI, starboard at 222 PSI. Within acceptable tolerance. Valves reseated properly.",
    },
    {
      vesselId: vessel.id,
      entryType: "maintenance" as const,
      timestamp: daysAgo(7),
      author: "C/E Jon Eaton",
      title: "Steering Gear Inspection",
      body: "Steering gear test conducted prior to departure. Emergency steering tested. Rudder response normal. Hydraulic fluid level satisfactory. No leaks observed.",
    },
    {
      vesselId: vessel.id,
      entryType: "drill" as const,
      timestamp: daysAgo(9),
      author: "Capt. Cevan Lesieur",
      title: "Fire Drill",
      body: "Weekly fire drill. All crew present. General alarm sounded. Fire teams deployed to simulated fire in engine room. CO2 system demonstrated (dry run). All watertight doors tested.",
    },
    {
      vesselId: vessel.id,
      entryType: "inspection" as const,
      timestamp: daysAgo(1),
      author: "Bob Jarvis",
      title: "Pre-Departure Safety Check",
      body: "Pre-departure checklist completed. Navigation lights operational. Sound signals tested. Hatches secured. Passenger count: 42. Weather conditions favorable.",
    },
    {
      vesselId: vessel.id,
      entryType: "maintenance" as const,
      timestamp: daysAgo(14),
      author: "C/E Jon Eaton",
      title: "Emergency Generator Test",
      body: "Monthly emergency generator test. Started on first attempt. Transferred load successfully. Ran under load for 30 minutes. Fuel tank topped off. Battery charger operational.",
    },
    {
      vesselId: vessel.id,
      entryType: "fuel_dip" as const,
      timestamp: daysAgo(1),
      author: "C/E Jon Eaton",
      title: "Daily Fuel Dip",
      body: "Fuel tanks dipped. Port tank: 78%. Starboard tank: 82%. Total fuel aboard: approximately 4,200 gallons. Sufficient for planned operations.",
    },
  ];

  const inserted = await db.insert(logbookEntries).values(entries).returning();
  console.log(`  ${inserted.length} logbook entries created`);

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
