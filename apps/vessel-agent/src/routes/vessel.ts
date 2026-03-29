import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { vessels, type Database } from "@maritime/db";

export async function vesselRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * GET /api/vessel
   * Get vessel profile (single vessel per installation)
   */
  app.get("/vessel", async (_request, reply) => {
    const result = await db.select().from(vessels).limit(1);
    if (result.length === 0) {
      return reply.status(404).send({ error: "No vessel configured" });
    }
    return { vessel: result[0] };
  });

  /**
   * PUT /api/vessel
   * Update vessel profile
   */
  app.put<{
    Body: {
      name?: string;
      imo_number?: string;
      vessel_type?: string;
      flag_state?: string;
      gross_tonnage?: number;
      year_built?: number;
      coi_date?: string;
      coi_expiry?: string;
      last_drydock?: string;
    };
  }>("/vessel", async (request, reply) => {
    const body = request.body;

    // Get current vessel
    const current = await db.select().from(vessels).limit(1);
    if (current.length === 0) {
      return reply.status(404).send({ error: "No vessel configured" });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.name) updates.name = body.name;
    if (body.imo_number) updates.imoNumber = body.imo_number;
    if (body.vessel_type) updates.vesselType = body.vessel_type;
    if (body.flag_state) updates.flagState = body.flag_state;
    if (body.gross_tonnage != null) updates.grossTonnage = String(body.gross_tonnage);
    if (body.year_built != null) updates.yearBuilt = body.year_built;
    if (body.coi_date) updates.coiDate = body.coi_date;
    if (body.coi_expiry) updates.coiExpiry = body.coi_expiry;
    if (body.last_drydock) updates.lastDrydock = body.last_drydock;

    const [updated] = await db
      .update(vessels)
      .set(updates)
      .where(eq(vessels.id, current[0].id))
      .returning();

    return { success: true, vessel: updated, updated_at: updated.updatedAt.toISOString() };
  });

  /**
   * GET /api/vessel/documents
   * List documents in the vault (placeholder)
   */
  app.get<{
    Querystring: { doc_type?: string };
  }>("/vessel/documents", async (_request, _reply) => {
    return { documents: [], count: 0 };
  });

  /**
   * POST /api/vessel/documents
   * Upload a document (placeholder)
   */
  app.post("/vessel/documents", async (_request, _reply) => {
    return { success: true, document_id: "placeholder" };
  });
}
