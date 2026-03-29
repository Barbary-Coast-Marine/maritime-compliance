import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    // Basic liveness check
    return reply.send({
      status: "ok",
      service: "vessel-agent",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    // Readiness check — verify DB connection
    try {
      const db = (app as any).db;
      // Simple query to verify connectivity
      await db.execute("SELECT 1");
      return reply.send({ status: "ready" });
    } catch (err) {
      return reply.status(503).send({ status: "not_ready", error: "database unavailable" });
    }
  });
}
