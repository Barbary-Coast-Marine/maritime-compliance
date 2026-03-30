import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { createDb } from "@maritime/db";
import { healthRoutes } from "./routes/health.js";
import { vesselRoutes } from "./routes/vessel.js";
import { complianceRoutes } from "./routes/compliance.js";
import { logbookRoutes } from "./routes/logbook.js";
import { alertRoutes } from "./routes/alerts.js";
import { authRoutes } from "./routes/auth.js";
import { reportRoutes } from "./routes/reports.js";

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

  // Multipart file upload support (10 MB limit)
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Database
  const db = createDb(process.env.DATABASE_URL);
  app.decorate("db", db);

  // Routes
  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(vesselRoutes, { prefix: "/api" });
  await app.register(complianceRoutes, { prefix: "/api" });
  await app.register(logbookRoutes, { prefix: "/api" });
  await app.register(alertRoutes, { prefix: "/api" });
  await app.register(reportRoutes, { prefix: "/api" });

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
