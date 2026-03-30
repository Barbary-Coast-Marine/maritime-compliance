import { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { vessels, documentVault, type Database } from "@maritime/db";
import { authPreHandler } from "../middleware/auth.js";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import crypto from "node:crypto";

const VALID_DOC_TYPES = [
  "coi",
  "stability_letter",
  "fcc_license",
  "abs_certificate",
  "drydock_report",
  "crew_license",
  "safety_plan",
  "other",
] as const;

const UPLOAD_DIR = path.resolve("./data/documents");

export async function vesselRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  // Ensure upload directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

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
   * List all documents for the vessel, ordered by uploaded_at desc
   */
  app.get<{
    Querystring: { doc_type?: string };
  }>("/vessel/documents", async (request) => {
    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) {
      return { documents: [], count: 0 };
    }

    let query = db
      .select()
      .from(documentVault)
      .where(eq(documentVault.vesselId, vessel.id))
      .orderBy(desc(documentVault.uploadedAt));

    const documents = await query;

    // Filter by doc_type in application if provided
    const filtered = request.query.doc_type
      ? documents.filter((d) => d.docType === request.query.doc_type)
      : documents;

    return { documents: filtered, count: filtered.length };
  });

  /**
   * POST /api/vessel/documents
   * Upload a document (multipart file upload, requires auth)
   */
  app.post("/vessel/documents", { preHandler: authPreHandler }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    // Collect fields from multipart
    const fields = data.fields as Record<string, any>;
    const docType = fields.doc_type?.value as string;
    const expiryDate = fields.expiry_date?.value as string | undefined;

    if (!docType || !VALID_DOC_TYPES.includes(docType as any)) {
      return reply.status(400).send({
        error: `Invalid doc_type. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
      });
    }

    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) {
      return reply.status(404).send({ error: "No vessel configured" });
    }

    // Generate unique filename to avoid collisions
    const ext = path.extname(data.filename);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    // Stream file to disk
    const fileBuffer = await data.toBuffer();
    await fs.writeFile(filePath, fileBuffer);

    const [doc] = await db
      .insert(documentVault)
      .values({
        vesselId: vessel.id,
        docType,
        filename: data.filename,
        mimeType: data.mimetype,
        filePath,
        uploadedBy: request.user!.id,
        expiryDate: expiryDate || null,
      })
      .returning();

    return {
      success: true,
      document: doc,
    };
  });

  /**
   * GET /api/vessel/documents/:id/download
   * Download a document file
   */
  app.get<{
    Params: { id: string };
  }>("/vessel/documents/:id/download", async (request, reply) => {
    const [doc] = await db
      .select()
      .from(documentVault)
      .where(eq(documentVault.id, request.params.id))
      .limit(1);

    if (!doc) {
      return reply.status(404).send({ error: "Document not found" });
    }

    // Check file exists
    try {
      await fs.access(doc.filePath);
    } catch {
      return reply.status(404).send({ error: "File not found on disk" });
    }

    reply.header("Content-Type", doc.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${doc.filename}"`);
    return reply.send(createReadStream(doc.filePath));
  });

  /**
   * GET /api/vessel/pre-departure-items
   * Returns pre-departure checklist items for this vessel's subchapter
   */
  app.get("/vessel/pre-departure-items", async (_request) => {
    // Phase 0: static list based on Subchapter H (SS Jeremiah O'Brien)
    const items = [
      { id: "pd-1", label: "Steering gear tested", citation: "46 CFR 78.47" },
      { id: "pd-2", label: "Whistle tested", citation: "46 CFR 78.47" },
      { id: "pd-3", label: "Engine room communication verified", citation: "46 CFR 78.47" },
      { id: "pd-4", label: "Passenger manifest filed with full names", citation: "46 CFR 78.33" },
      { id: "pd-5", label: "Stability verified per trim book", citation: "46 CFR 78.53" },
      { id: "pd-6", label: "Hatches and openings secured", citation: "46 CFR 78.50" },
      { id: "pd-7", label: "Lifesaving equipment ready and accessible", citation: "46 CFR 78.77" },
      { id: "pd-8", label: "Weather reviewed for route" },
      { id: "pd-9", label: "Crew briefing completed" },
    ];
    return { items, count: items.length };
  });

  /**
   * DELETE /api/vessel/documents/:id
   * Delete a document (removes file and database record)
   */
  app.delete<{
    Params: { id: string };
  }>("/vessel/documents/:id", { preHandler: authPreHandler }, async (request, reply) => {
    const [doc] = await db
      .select()
      .from(documentVault)
      .where(eq(documentVault.id, request.params.id))
      .limit(1);

    if (!doc) {
      return reply.status(404).send({ error: "Document not found" });
    }

    // Remove file from disk (ignore if already missing)
    try {
      await fs.unlink(doc.filePath);
    } catch {
      // File already gone, proceed with DB cleanup
    }

    await db.delete(documentVault).where(eq(documentVault.id, doc.id));

    return { success: true, deleted: doc.id };
  });
}
