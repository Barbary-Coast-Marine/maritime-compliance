import { FastifyInstance } from "fastify";
import { eq, desc, sql, count } from "drizzle-orm";
import { logbookEntries, vessels, users, type Database } from "@maritime/db";
import { authPreHandler } from "../middleware/auth.js";

export async function logbookRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * GET /api/logbook
   * List logbook entries with optional filters
   */
  app.get<{
    Querystring: { type?: string; limit?: number; offset?: number };
  }>("/logbook", async (request, _reply) => {
    const { type, limit = 50, offset = 0 } = request.query;

    const conditions = [];
    if (type) {
      conditions.push(eq(logbookEntries.entryType, type as any));
    }

    const baseQuery = type
      ? db.select().from(logbookEntries).where(eq(logbookEntries.entryType, type as any))
      : db.select().from(logbookEntries);

    const entries = await baseQuery
      .orderBy(desc(logbookEntries.timestamp))
      .limit(Number(limit))
      .offset(Number(offset));

    const [{ total }] = type
      ? await db.select({ total: count() }).from(logbookEntries).where(eq(logbookEntries.entryType, type as any))
      : await db.select({ total: count() }).from(logbookEntries);

    return {
      entries,
      total: Number(total),
      limit: Number(limit),
      offset: Number(offset),
    };
  });

  /**
   * POST /api/logbook
   * Create a new logbook entry
   */
  app.post<{
    Body: {
      entry_type: "drill" | "inspection" | "fuel_dip" | "maintenance" | "general";
      title: string;
      body: string;
      author?: string; // ignored — always pulled from JWT
    };
  }>("/logbook", { preHandler: authPreHandler }, async (request, reply) => {
    const { entry_type, title, body } = request.body;

    // Resolve author from JWT — look up display name from DB
    const jwtUser = request.user!;
    let author = jwtUser.username;
    const [dbUser] = await db.select({ displayName: users.displayName, username: users.username })
      .from(users).where(eq(users.id, jwtUser.id)).limit(1);
    if (dbUser?.displayName) author = dbUser.displayName;

    // Get vessel ID
    const [vessel] = await db.select({ id: vessels.id }).from(vessels).limit(1);
    if (!vessel) {
      return reply.status(400).send({ error: "No vessel configured" });
    }

    const [entry] = await db
      .insert(logbookEntries)
      .values({
        vesselId: vessel.id,
        entryType: entry_type,
        title,
        body,
        author,
      })
      .returning();

    return {
      success: true,
      entry_id: entry.id,
      created_at: entry.timestamp.toISOString(),
    };
  });

  /**
   * GET /api/logbook/:id
   * Get a single logbook entry
   */
  app.get<{
    Params: { id: string };
  }>("/logbook/:id", async (request, reply) => {
    const { id } = request.params;

    const [entry] = await db
      .select()
      .from(logbookEntries)
      .where(eq(logbookEntries.id, id));

    if (!entry) {
      return reply.status(404).send({ error: "Entry not found" });
    }
    return { entry };
  });
}
