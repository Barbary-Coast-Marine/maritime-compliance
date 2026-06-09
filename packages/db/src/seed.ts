import { createDb, vessels, users, logbookEntries, crewProfiles, crewCredentials } from "./index";
import bcrypt from "bcryptjs";

const db = createDb();

async function seed() {
  console.log("Seeding database...");

  // Skip if already seeded (idempotent — safe to run on every startup)
  const existing = await db.select({ id: vessels.id }).from(vessels).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded, skipping.");
    process.exit(0);
  }

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

  // Create captain user
  const captainHash = await bcrypt.hash("obrien2026", 10);
  const [captainUser] = await db
    .insert(users)
    .values({
      username: "captain",
      passwordHash: captainHash,
      role: "captain",
      vesselId: vessel.id,
      displayName: "Capt. Cevan Lesieur",
      isActive: true,
    })
    .returning();

  console.log(`  User created: ${captainUser.username} (${captainUser.role})`);

  // Create additional crew users
  const engineerHash = await bcrypt.hash("eaton2026", 10);
  const [engineerUser] = await db
    .insert(users)
    .values({
      username: "jon.eaton",
      passwordHash: engineerHash,
      role: "engineer",
      vesselId: vessel.id,
      displayName: "C/E Jon Eaton",
      isActive: true,
    })
    .returning();

  const crewHash = await bcrypt.hash("jarvis2026", 10);
  const [crewUser] = await db
    .insert(users)
    .values({
      username: "bob.jarvis",
      passwordHash: crewHash,
      role: "crew",
      vesselId: vessel.id,
      displayName: "Bob Jarvis",
      isActive: true,
    })
    .returning();

  console.log(`  Users created: ${engineerUser.username}, ${crewUser.username}`);

  // Create crew profiles
  const [captainProfile] = await db
    .insert(crewProfiles)
    .values({
      userId: captainUser.id,
      vesselId: vessel.id,
      firstName: "Cevan",
      lastName: "Lesieur",
      preferredName: "Capt. Lesieur",
      email: "captain@ssjobrien.org",
      department: "deck",
      startDate: "2020-01-15",
      isVolunteer: false,
      status: "active",
      fitForDuty: true,
      emergencyContactName: "Maria Lesieur",
      emergencyContactRelationship: "spouse",
      emergencyContactPhone: "415-555-0101",
    })
    .returning();

  const [engineerProfile] = await db
    .insert(crewProfiles)
    .values({
      userId: engineerUser.id,
      vesselId: vessel.id,
      firstName: "Jon",
      lastName: "Eaton",
      preferredName: "Chief",
      email: "engineer@ssjobrien.org",
      department: "engine",
      startDate: "2019-03-01",
      isVolunteer: false,
      status: "active",
      fitForDuty: true,
      emergencyContactName: "Sarah Eaton",
      emergencyContactRelationship: "spouse",
      emergencyContactPhone: "415-555-0202",
    })
    .returning();

  const [crewProfile] = await db
    .insert(crewProfiles)
    .values({
      userId: crewUser.id,
      vesselId: vessel.id,
      firstName: "Bob",
      lastName: "Jarvis",
      email: "bob@ssjobrien.org",
      department: "deck",
      startDate: "2022-05-10",
      isVolunteer: true,
      status: "active",
      fitForDuty: true,
      tshirtSize: "L",
      badgeIssued: true,
      badgeIssuedDate: "2022-05-10",
      safetyOrientationDate: "2022-05-10",
      emergencyContactName: "Linda Jarvis",
      emergencyContactRelationship: "spouse",
      emergencyContactPhone: "415-555-0303",
    })
    .returning();

  console.log(`  Crew profiles created: ${captainProfile.id}, ${engineerProfile.id}, ${crewProfile.id}`);

  // Add credentials for licensed crew
  await db.insert(crewCredentials).values([
    {
      crewProfileId: captainProfile.id,
      credentialType: "mmc",
      title: "Merchant Mariner Credential",
      credentialNumber: "MMC-2024-001234",
      issuer: "USCG",
      issueDate: "2024-01-15",
      expiryDate: "2029-01-15",
      status: "current",
    },
    {
      crewProfileId: captainProfile.id,
      credentialType: "license",
      title: "Master 1600 GRT",
      grade: "Master",
      issuer: "USCG",
      issueDate: "2024-01-15",
      expiryDate: "2029-01-15",
      status: "current",
    },
    {
      crewProfileId: captainProfile.id,
      credentialType: "twic",
      title: "TWIC Card",
      credentialNumber: "TWIC-98765",
      issuer: "TSA",
      issueDate: "2023-06-01",
      expiryDate: "2028-06-01",
      status: "current",
    },
    {
      crewProfileId: engineerProfile.id,
      credentialType: "mmc",
      title: "Merchant Mariner Credential",
      credentialNumber: "MMC-2023-005678",
      issuer: "USCG",
      issueDate: "2023-08-20",
      expiryDate: "2028-08-20",
      status: "current",
    },
    {
      crewProfileId: engineerProfile.id,
      credentialType: "license",
      title: "Chief Engineer Steam/Motor",
      grade: "Chief Engineer",
      issuer: "USCG",
      issueDate: "2023-08-20",
      expiryDate: "2028-08-20",
      status: "current",
    },
    {
      crewProfileId: engineerProfile.id,
      credentialType: "medical_cert",
      title: "Medical Certificate",
      issuer: "Dr. Smith, Maritime Medical",
      issueDate: "2025-11-01",
      expiryDate: "2026-11-01",
      status: "current",
    },
    {
      crewProfileId: crewProfile.id,
      credentialType: "safety_orientation",
      title: "Ship Safety Orientation",
      issuer: "SS Jeremiah O'Brien",
      issueDate: "2022-05-10",
      status: "current",
    },
  ]);

  console.log("  Crew credentials created");

  // Seed 10 logbook entries
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  const entries = [
    {
      vesselId: vessel.id,
      entryType: "drill" as const,
      timestamp: daysAgo(12),
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
      timestamp: daysAgo(19),
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
