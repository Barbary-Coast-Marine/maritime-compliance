import { createDb, vessels, users } from "./index";
import crypto from "node:crypto";

const db = createDb();

async function seed() {
  console.log("Seeding database...");

  // Insert sample vessel: SS Jeremiah O'Brien
  const [vessel] = await db
    .insert(vessels)
    .values({
      name: "SS Jeremiah O'Brien",
      imoNumber: "5174657",
      vesselType: "small_passenger",
      flagState: "US",
      grossTonnage: "7176.00",
      yearBuilt: 1943,
      coiDate: "2025-06-15",
      coiExpiry: "2026-06-15",
      lastDrydock: "2024-09-01",
      complianceStatus: "compliant",
    })
    .returning();

  console.log(`  Vessel created: ${vessel.name} (${vessel.id})`);

  // Create default captain user
  // In production, use bcrypt. This is a seed-only SHA-256 placeholder.
  const passwordHash = crypto.createHash("sha256").update("changeme").digest("hex");

  const [user] = await db
    .insert(users)
    .values({
      username: "captain",
      passwordHash,
      role: "captain",
      vesselId: vessel.id,
    })
    .returning();

  console.log(`  User created: ${user.username} (${user.role})`);
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
