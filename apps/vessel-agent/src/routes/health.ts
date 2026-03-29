import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import type { Database } from "@maritime/db";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "vessel-agent",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    try {
      const db = (app as any).db as Database;
      await db.execute(sql`SELECT 1`);
      return reply.send({ status: "ready" });
    } catch (err) {
      return reply.status(503).send({ status: "not_ready", error: "database unavailable" });
    }
  });
}
