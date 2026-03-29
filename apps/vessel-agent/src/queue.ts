import PgBoss from "pg-boss";

export async function setupJobQueue(connectionString?: string): Promise<PgBoss> {
  const boss = new PgBoss(
    connectionString ?? process.env.DATABASE_URL ?? "postgresql://maritime:maritime@localhost:5432/maritime",
  );

  boss.on("error", (error) => {
    console.error("pg-boss error:", error);
  });

  await boss.start();

  // Register job handlers (placeholders for now)
  await boss.work("compliance-check", async (job) => {
    console.log("Running compliance check:", job.data);
    // TODO: Implement compliance rule evaluation
  });

  await boss.work("telemetry-ingest", async (job) => {
    console.log("Ingesting telemetry:", job.data);
    // TODO: Implement sensor data processing
  });

  await boss.work("report-generate", async (job) => {
    console.log("Generating report:", job.data);
    // TODO: Implement PDF audit report generation
  });

  console.log("pg-boss job queue started");
  return boss;
}
