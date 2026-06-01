import { FastifyInstance } from "fastify";
import { users, type Database } from "@maritime/db";
import { eq } from "drizzle-orm";
import { authPreHandler } from "../middleware/auth.js";
import { runAgent, type AgentMessage } from "../agent/index.js";

export async function agentRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * POST /api/agent/chat
   * Natural language interface to the compliance agent.
   * Body: { message: string; history?: { role: "user"|"assistant"; content: string }[] }
   */
  app.post<{
    Body: { message: string; history?: AgentMessage[] };
  }>("/agent/chat", { preHandler: authPreHandler }, async (request, reply) => {
    const { message, history = [] } = request.body;

    if (!message?.trim()) {
      return reply.status(400).send({ error: "message is required" });
    }

    if (!process.env.NEBIUS_API_KEY) {
      return reply.status(503).send({ error: "Agent not configured — NEBIUS_API_KEY missing" });
    }

    // Resolve display name from JWT for logbook authorship
    const jwtUser = request.user!;
    let author = jwtUser.username;
    const [dbUser] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, jwtUser.id))
      .limit(1);
    if (dbUser?.displayName) author = dbUser.displayName;

    try {
      const result = await runAgent(db, message, author, history);
      return {
        reply: result.reply,
        actions: result.actions,
      };
    } catch (err) {
      app.log.error(err, "Agent error");
      return reply.status(500).send({ error: "Agent failed", detail: (err as Error).message });
    }
  });

  /**
   * GET /api/agent/status
   * Returns whether the agent is configured and ready.
   */
  app.get("/agent/status", async (_request, _reply) => {
    return {
      configured: !!(process.env.NEBIUS_API_KEY && process.env.TAVILY_API_KEY),
      nebius: !!process.env.NEBIUS_API_KEY,
      tavily: !!process.env.TAVILY_API_KEY,
      composio: !!process.env.COMPOSIO_API_KEY,
    };
  });
}
