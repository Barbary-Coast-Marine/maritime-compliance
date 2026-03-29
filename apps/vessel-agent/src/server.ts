import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { createDb } from "@maritime/db";
import { healthRoutes } from "./routes/health.js";
import { vesselRoutes } from "./routes/vessel.js";
import { complianceRoutes } from "./routes/compliance.js";
import { logbookRoutes } from "./routes/logbook.js";
import { alertRoutes } from "./routes/alerts.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  // CORS for dashboard access from same LAN
  await app.register(cors, { origin: true });

  // Database
  const db = createDb(process.env.DATABASE_URL);
  app.decorate("db", db);

  // Routes
  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(vesselRoutes, { prefix: "/api" });
  await app.register(complianceRoutes, { prefix: "/api" });
  await app.register(logbookRoutes, { prefix: "/api" });
  await app.register(alertRoutes, { prefix: "/api" });

  // Graceful shutdown
  const shutdown = async () => {
    app.log.info("Shutting down...");
    await app.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await app.listen({ port, host });
  app.log.info(`Maritime vessel-agent running on http://${host}:${port}`);
}

main().catch((err) => {
  console.error("Failed to start vessel-agent:", err);
  process.exit(1);
});
