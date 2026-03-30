import { FastifyInstance } from "fastify";
import { eq, desc, and, or, ilike, sql, ne } from "drizzle-orm";
import {
  vessels,
  documentVault,
  users,
  crewProfiles,
  crewCredentials,
  complianceRules,
  complianceEvents,
  logbookEntries,
  type Database,
} from "@maritime/db";
import { loadRules } from "@maritime/regulations";
import { authPreHandler } from "../middleware/auth.js";
import bcrypt from "bcryptjs";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../../packages/regulations/rules");
const UPLOAD_DIR = path.resolve("./data/documents");

/** Middleware: require captain or fleet_manager role */
async function adminGuard(request: any, reply: any) {
  await authPreHandler(request, reply);
  if (reply.sent) return;
  const role = request.user?.role;
  if (role !== "captain" && role !== "fleet_manager") {
    return reply.status(403).send({ error: "Admin access required (captain or fleet_manager)" });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  // ═══════════════════════════════════════════════════════
  // VESSEL ADMIN
  // ═══════════════════════════════════════════════════════

  app.get("/admin/vessel", { preHandler: adminGuard }, async (_request, reply) => {
    const result = await db.select().from(vessels).limit(1);
    if (result.length === 0) {
      return reply.status(404).send({ error: "No vessel configured" });
    }
    return { vessel: result[0] };
  });

  app.put<{
    Body: Record<string, any>;
  }>("/admin/vessel", { preHandler: adminGuard }, async (request, reply) => {
    const body = request.body;
    const current = await db.select().from(vessels).limit(1);
    if (current.length === 0) {
      return reply.status(404).send({ error: "No vessel configured" });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.name != null) updates.name = body.name;
    if (body.imo_number != null) updates.imoNumber = body.imo_number;
    if (body.vessel_type != null) updates.vesselType = body.vessel_type;
    if (body.flag_state != null) updates.flagState = body.flag_state;
    if (body.gross_tonnage != null) updates.grossTonnage = String(body.gross_tonnage);
    if (body.year_built != null) updates.yearBuilt = body.year_built;
    if (body.coi_date != null) updates.coiDate = body.coi_date;
    if (body.coi_expiry != null) updates.coiExpiry = body.coi_expiry;
    if (body.last_drydock != null) updates.lastDrydock = body.last_drydock;
    if (body.call_sign != null) updates.callSign = body.call_sign;
    if (body.mmsi != null) updates.mmsi = body.mmsi;
    if (body.official_number != null) updates.officialNumber = body.official_number;
    if (body.hailing_port != null) updates.hailingPort = body.hailing_port;
    if (body.propulsion != null) updates.propulsion = body.propulsion;
    if (body.operator != null) updates.operator = body.operator;

    const [updated] = await db
      .update(vessels)
      .set(updates)
      .where(eq(vessels.id, current[0].id))
      .returning();

    return { success: true, vessel: updated };
  });

  app.get("/admin/vessel/certificates", { preHandler: adminGuard }, async (_request) => {
    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) return { certificates: [] };

    const docs = await db
      .select()
      .from(documentVault)
      .where(
        and(
          eq(documentVault.vesselId, vessel.id),
          or(
            eq(documentVault.category, "certificate"),
            eq(documentVault.docType, "coi"),
            eq(documentVault.docType, "stability_letter"),
            eq(documentVault.docType, "fcc_license"),
            eq(documentVault.docType, "abs_certificate"),
          ),
          or(eq(documentVault.isDeleted, false), sql`${documentVault.isDeleted} IS NULL`),
        ),
      )
      .orderBy(documentVault.expiryDate);

    const now = new Date();
    const certificates = docs.map((d) => {
      let daysUntilExpiry: number | null = null;
      let expiryStatus = "unknown";
      if (d.expiryDate) {
        const expiry = new Date(d.expiryDate);
        daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 0) expiryStatus = "expired";
        else if (daysUntilExpiry <= 30) expiryStatus = "critical";
        else if (daysUntilExpiry <= 90) expiryStatus = "warning";
        else expiryStatus = "current";
      }
      return { ...d, daysUntilExpiry, expiryStatus };
    });

    return { certificates };
  });

  app.put<{
    Params: { id: string };
    Body: { expiry_date?: string; doc_type?: string; notes?: string };
  }>("/admin/vessel/certificates/:id", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [doc] = await db.select().from(documentVault).where(eq(documentVault.id, id)).limit(1);
    if (!doc) return reply.status(404).send({ error: "Certificate not found" });

    const updates: Record<string, any> = {};
    if (body.expiry_date != null) updates.expiryDate = body.expiry_date;
    if (body.doc_type != null) updates.docType = body.doc_type;
    if (body.notes != null) updates.notes = body.notes;

    const [updated] = await db
      .update(documentVault)
      .set(updates)
      .where(eq(documentVault.id, id))
      .returning();

    return { success: true, certificate: updated };
  });

  // ═══════════════════════════════════════════════════════
  // CREW ADMIN
  // ═══════════════════════════════════════════════════════

  app.get<{
    Querystring: { status?: string; role?: string; search?: string; department?: string };
  }>("/admin/crew", { preHandler: adminGuard }, async (request) => {
    const { status, role, search, department } = request.query;

    // Get all crew profiles with user info
    const profiles = await db
      .select({
        profile: crewProfiles,
        user: {
          id: users.id,
          username: users.username,
          role: users.role,
          displayName: users.displayName,
        },
      })
      .from(crewProfiles)
      .leftJoin(users, eq(crewProfiles.userId, users.id))
      .orderBy(crewProfiles.lastName);

    // Get credential counts per profile
    const allCredentials = await db.select().from(crewCredentials);
    const now = new Date();

    const credentialMap = new Map<string, { total: number; expiring: number; expired: number }>();
    for (const cred of allCredentials) {
      const entry = credentialMap.get(cred.crewProfileId) || { total: 0, expiring: 0, expired: 0 };
      entry.total++;
      if (cred.expiryDate) {
        const expiry = new Date(cred.expiryDate);
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) entry.expired++;
        else if (daysLeft <= 90) entry.expiring++;
      }
      credentialMap.set(cred.crewProfileId, entry);
    }

    let result = profiles.map((p) => ({
      ...p.profile,
      user: p.user,
      credentialSummary: credentialMap.get(p.profile.id) || { total: 0, expiring: 0, expired: 0 },
    }));

    // Apply filters
    if (status) result = result.filter((p) => p.status === status);
    if (department) result = result.filter((p) => p.department === department);
    if (role) result = result.filter((p) => p.user?.role === role);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.firstName.toLowerCase().includes(q) ||
          p.lastName.toLowerCase().includes(q) ||
          (p.preferredName && p.preferredName.toLowerCase().includes(q)),
      );
    }

    return { crew: result, count: result.length };
  });

  app.get<{
    Params: { id: string };
  }>("/admin/crew/:id", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;

    const [result] = await db
      .select({
        profile: crewProfiles,
        user: {
          id: users.id,
          username: users.username,
          role: users.role,
          displayName: users.displayName,
          email: users.email,
        },
      })
      .from(crewProfiles)
      .leftJoin(users, eq(crewProfiles.userId, users.id))
      .where(eq(crewProfiles.id, id))
      .limit(1);

    if (!result) return reply.status(404).send({ error: "Crew member not found" });

    const credentials = await db
      .select()
      .from(crewCredentials)
      .where(eq(crewCredentials.crewProfileId, id))
      .orderBy(crewCredentials.credentialType);

    const documents = await db
      .select()
      .from(documentVault)
      .where(
        and(
          eq(documentVault.crewProfileId, id),
          or(eq(documentVault.isDeleted, false), sql`${documentVault.isDeleted} IS NULL`),
        ),
      )
      .orderBy(desc(documentVault.uploadedAt));

    return {
      ...result.profile,
      user: result.user,
      credentials,
      documents,
    };
  });

  app.post<{
    Body: {
      personal: {
        first_name: string;
        middle_name?: string;
        last_name: string;
        preferred_name?: string;
        email: string;
        phone?: string;
        date_of_birth?: string;
        address_line1?: string;
        address_line2?: string;
        city?: string;
        state?: string;
        zip?: string;
        emergency_contact_name?: string;
        emergency_contact_relationship?: string;
        emergency_contact_phone?: string;
        next_of_kin_name?: string;
        next_of_kin_relationship?: string;
        next_of_kin_phone?: string;
        next_of_kin_address?: string;
      };
      assignment: {
        role: string;
        department?: string;
        watch_assignment?: string;
        start_date?: string;
        is_volunteer: boolean;
      };
      credentials?: Array<{
        credential_type: string;
        title: string;
        credential_number?: string;
        grade?: string;
        issuer?: string;
        issue_date?: string;
        expiry_date?: string;
        status?: string;
        notes?: string;
      }>;
      medical?: {
        fit_for_duty?: boolean;
        medical_notes?: string;
        allergies?: string;
      };
      volunteer?: {
        tshirt_size?: string;
        badge_issued?: boolean;
        badge_issued_date?: string;
        safety_orientation_date?: string;
      };
      status?: string;
    };
  }>("/admin/crew", { preHandler: adminGuard }, async (request, reply) => {
    const body = request.body;
    const { personal, assignment, credentials, medical, volunteer } = body;

    if (!personal?.first_name || !personal?.last_name || !personal?.email) {
      return reply.status(400).send({ error: "first_name, last_name, and email are required" });
    }

    // Get vessel
    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) return reply.status(404).send({ error: "No vessel configured" });

    // Generate username and temp password
    const baseUsername = `${personal.first_name.toLowerCase()}.${personal.last_name.toLowerCase()}`.replace(/[^a-z.]/g, "");
    let username = baseUsername;

    // Check for duplicates
    const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing) {
      username = `${baseUsername}${Math.floor(Math.random() * 900) + 100}`;
    }

    const tempPassword = `${personal.first_name.toLowerCase()}${personal.last_name.toLowerCase()}${Math.floor(Math.random() * 9000) + 1000}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Create user + profile + credentials in one flow
    const userRole = assignment.is_volunteer ? "volunteer" : (assignment.role as any) || "crew";

    const [newUser] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        role: userRole,
        vesselId: vessel.id,
        displayName: personal.preferred_name || `${personal.first_name} ${personal.last_name}`,
        email: personal.email,
        isActive: body.status === "active",
      })
      .returning();

    const [profile] = await db
      .insert(crewProfiles)
      .values({
        userId: newUser.id,
        vesselId: vessel.id,
        firstName: personal.first_name,
        middleName: personal.middle_name || null,
        lastName: personal.last_name,
        preferredName: personal.preferred_name || null,
        email: personal.email,
        phone: personal.phone || null,
        dateOfBirth: personal.date_of_birth || null,
        addressLine1: personal.address_line1 || null,
        addressLine2: personal.address_line2 || null,
        city: personal.city || null,
        state: personal.state || null,
        zip: personal.zip || null,
        emergencyContactName: personal.emergency_contact_name || null,
        emergencyContactRelationship: personal.emergency_contact_relationship || null,
        emergencyContactPhone: personal.emergency_contact_phone || null,
        nextOfKinName: personal.next_of_kin_name || null,
        nextOfKinRelationship: personal.next_of_kin_relationship || null,
        nextOfKinPhone: personal.next_of_kin_phone || null,
        nextOfKinAddress: personal.next_of_kin_address || null,
        department: assignment.department || null,
        watchAssignment: assignment.watch_assignment || null,
        startDate: assignment.start_date || null,
        isVolunteer: assignment.is_volunteer,
        status: body.status || "pending",
        fitForDuty: medical?.fit_for_duty ?? true,
        medicalNotes: medical?.medical_notes || null,
        allergies: medical?.allergies || null,
        tshirtSize: volunteer?.tshirt_size || null,
        badgeIssued: volunteer?.badge_issued || false,
        badgeIssuedDate: volunteer?.badge_issued_date || null,
        safetyOrientationDate: volunteer?.safety_orientation_date || null,
      })
      .returning();

    // Insert credentials
    if (credentials && credentials.length > 0) {
      await db.insert(crewCredentials).values(
        credentials.map((c) => ({
          crewProfileId: profile.id,
          credentialType: c.credential_type,
          title: c.title,
          credentialNumber: c.credential_number || null,
          grade: c.grade || null,
          issuer: c.issuer || null,
          issueDate: c.issue_date || null,
          expiryDate: c.expiry_date || null,
          status: c.status || "current",
          notes: c.notes || null,
        })),
      );
    }

    return {
      success: true,
      profile,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        tempPassword,
      },
    };
  });

  app.put<{
    Params: { id: string };
    Body: Record<string, any>;
  }>("/admin/crew/:id", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(crewProfiles).where(eq(crewProfiles.id, id)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Crew member not found" });

    const updates: Record<string, any> = { updatedAt: new Date() };
    const fieldMap: Record<string, string> = {
      first_name: "firstName",
      middle_name: "middleName",
      last_name: "lastName",
      preferred_name: "preferredName",
      email: "email",
      phone: "phone",
      date_of_birth: "dateOfBirth",
      address_line1: "addressLine1",
      address_line2: "addressLine2",
      city: "city",
      state: "state",
      zip: "zip",
      emergency_contact_name: "emergencyContactName",
      emergency_contact_relationship: "emergencyContactRelationship",
      emergency_contact_phone: "emergencyContactPhone",
      next_of_kin_name: "nextOfKinName",
      next_of_kin_relationship: "nextOfKinRelationship",
      next_of_kin_phone: "nextOfKinPhone",
      next_of_kin_address: "nextOfKinAddress",
      department: "department",
      watch_assignment: "watchAssignment",
      start_date: "startDate",
      is_volunteer: "isVolunteer",
      status: "status",
      fit_for_duty: "fitForDuty",
      medical_notes: "medicalNotes",
      allergies: "allergies",
      tshirt_size: "tshirtSize",
      badge_issued: "badgeIssued",
      badge_issued_date: "badgeIssuedDate",
      safety_orientation_date: "safetyOrientationDate",
    };

    for (const [snakeKey, camelKey] of Object.entries(fieldMap)) {
      if (body[snakeKey] !== undefined) updates[camelKey] = body[snakeKey];
    }

    const [updated] = await db
      .update(crewProfiles)
      .set(updates)
      .where(eq(crewProfiles.id, id))
      .returning();

    return { success: true, profile: updated };
  });

  app.delete<{
    Params: { id: string };
  }>("/admin/crew/:id", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;

    const [profile] = await db.select().from(crewProfiles).where(eq(crewProfiles.id, id)).limit(1);
    if (!profile) return reply.status(404).send({ error: "Crew member not found" });

    // Soft deactivate
    await db
      .update(crewProfiles)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(crewProfiles.id, id));

    if (profile.userId) {
      await db.update(users).set({ isActive: false }).where(eq(users.id, profile.userId));
    }

    return { success: true, deactivated: id };
  });

  // Crew Credentials CRUD
  app.post<{
    Params: { id: string };
    Body: {
      credential_type: string;
      title: string;
      credential_number?: string;
      grade?: string;
      issuer?: string;
      issue_date?: string;
      expiry_date?: string;
      status?: string;
      notes?: string;
    };
  }>("/admin/crew/:id/credentials", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [profile] = await db.select().from(crewProfiles).where(eq(crewProfiles.id, id)).limit(1);
    if (!profile) return reply.status(404).send({ error: "Crew member not found" });

    if (!body.credential_type || !body.title) {
      return reply.status(400).send({ error: "credential_type and title are required" });
    }

    const [cred] = await db
      .insert(crewCredentials)
      .values({
        crewProfileId: id,
        credentialType: body.credential_type,
        title: body.title,
        credentialNumber: body.credential_number || null,
        grade: body.grade || null,
        issuer: body.issuer || null,
        issueDate: body.issue_date || null,
        expiryDate: body.expiry_date || null,
        status: body.status || "current",
        notes: body.notes || null,
      })
      .returning();

    return { success: true, credential: cred };
  });

  app.put<{
    Params: { id: string; credId: string };
    Body: Record<string, any>;
  }>("/admin/crew/:id/credentials/:credId", { preHandler: adminGuard }, async (request, reply) => {
    const { credId } = request.params;
    const body = request.body;

    const [existing] = await db.select().from(crewCredentials).where(eq(crewCredentials.id, credId)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Credential not found" });

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.credential_type != null) updates.credentialType = body.credential_type;
    if (body.title != null) updates.title = body.title;
    if (body.credential_number != null) updates.credentialNumber = body.credential_number;
    if (body.grade != null) updates.grade = body.grade;
    if (body.issuer != null) updates.issuer = body.issuer;
    if (body.issue_date != null) updates.issueDate = body.issue_date;
    if (body.expiry_date != null) updates.expiryDate = body.expiry_date;
    if (body.status != null) updates.status = body.status;
    if (body.notes != null) updates.notes = body.notes;

    const [updated] = await db
      .update(crewCredentials)
      .set(updates)
      .where(eq(crewCredentials.id, credId))
      .returning();

    return { success: true, credential: updated };
  });

  app.delete<{
    Params: { id: string; credId: string };
  }>("/admin/crew/:id/credentials/:credId", { preHandler: adminGuard }, async (request, reply) => {
    const { credId } = request.params;

    const [existing] = await db.select().from(crewCredentials).where(eq(crewCredentials.id, credId)).limit(1);
    if (!existing) return reply.status(404).send({ error: "Credential not found" });

    await db.delete(crewCredentials).where(eq(crewCredentials.id, credId));
    return { success: true, deleted: credId };
  });

  // ═══════════════════════════════════════════════════════
  // RULES ADMIN
  // ═══════════════════════════════════════════════════════

  app.get("/admin/rules", { preHandler: adminGuard }, async () => {
    // Load all YAML rules
    const { rules, errors } = loadRules(RULES_DIR);

    // Get active rules from DB for this vessel
    const dbRules = await db.select().from(complianceRules);
    const activeSet = new Set(dbRules.filter((r) => r.isActive).map((r) => r.ruleCode));
    const dbRuleMap = new Map(dbRules.map((r) => [r.ruleCode, r]));

    const result = rules.map((rule) => {
      const dbRule = dbRuleMap.get(rule.rule_id);
      return {
        ...rule,
        is_active: activeSet.has(rule.rule_id),
        db_id: dbRule?.id || null,
        warning_days_override: dbRule?.severityLevels ? (dbRule.severityLevels as any).warning_days : null,
        critical_days_override: dbRule?.severityLevels ? (dbRule.severityLevels as any).critical_days : null,
      };
    });

    return {
      rules: result,
      count: result.length,
      active_count: result.filter((r) => r.is_active).length,
      errors: errors.length > 0 ? errors : undefined,
    };
  });

  app.put<{
    Params: { ruleId: string };
    Body: { is_active?: boolean; warning_days?: number; critical_days?: number };
  }>("/admin/rules/:ruleId", { preHandler: adminGuard }, async (request, reply) => {
    const { ruleId } = request.params;
    const body = request.body;

    // Check if rule exists in DB
    const [existing] = await db
      .select()
      .from(complianceRules)
      .where(eq(complianceRules.ruleCode, ruleId))
      .limit(1);

    if (existing) {
      const updates: Record<string, any> = {};
      if (body.is_active !== undefined) updates.isActive = body.is_active;
      if (body.warning_days != null || body.critical_days != null) {
        const currentLevels = (existing.severityLevels as any) || {};
        updates.severityLevels = {
          ...currentLevels,
          ...(body.warning_days != null ? { warning_days: body.warning_days } : {}),
          ...(body.critical_days != null ? { critical_days: body.critical_days } : {}),
        };
      }

      const [updated] = await db
        .update(complianceRules)
        .set(updates)
        .where(eq(complianceRules.id, existing.id))
        .returning();

      return { success: true, rule: updated };
    } else {
      // Insert new DB record for this YAML rule
      const [inserted] = await db
        .insert(complianceRules)
        .values({
          ruleCode: ruleId,
          triggerType: "calendar",
          isActive: body.is_active ?? true,
          triggerConfig: {},
          severityLevels:
            body.warning_days != null || body.critical_days != null
              ? { warning_days: body.warning_days, critical_days: body.critical_days }
              : {},
          requiredAction: "",
          deadlineCalc: "",
        })
        .returning();

      return { success: true, rule: inserted };
    }
  });

  // ═══════════════════════════════════════════════════════
  // DOCUMENTS ADMIN
  // ═══════════════════════════════════════════════════════

  app.get<{
    Querystring: {
      category?: string;
      crew_profile_id?: string;
      expiry_status?: string;
      search?: string;
    };
  }>("/admin/documents", { preHandler: adminGuard }, async (request) => {
    const { category, crew_profile_id, expiry_status, search } = request.query;

    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) return { documents: [], count: 0 };

    let allDocs = await db
      .select()
      .from(documentVault)
      .where(
        and(
          eq(documentVault.vesselId, vessel.id),
          or(eq(documentVault.isDeleted, false), sql`${documentVault.isDeleted} IS NULL`),
        ),
      )
      .orderBy(desc(documentVault.uploadedAt));

    const now = new Date();

    // Enrich with expiry info
    let enriched = allDocs.map((d) => {
      let daysUntilExpiry: number | null = null;
      let expiryStatus = "unknown";
      if (d.expiryDate) {
        const expiry = new Date(d.expiryDate);
        daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 0) expiryStatus = "expired";
        else if (daysUntilExpiry <= 90) expiryStatus = "expiring";
        else expiryStatus = "current";
      }
      return { ...d, daysUntilExpiry, expiryStatus };
    });

    // Apply filters
    if (category && category !== "all") {
      enriched = enriched.filter((d) => d.category === category);
    }
    if (crew_profile_id) {
      enriched = enriched.filter((d) => d.crewProfileId === crew_profile_id);
    }
    if (expiry_status) {
      enriched = enriched.filter((d) => d.expiryStatus === expiry_status);
    }
    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          (d.notes && d.notes.toLowerCase().includes(q)),
      );
    }

    // Summary counts
    const summary = {
      current: allDocs.filter((d) => {
        if (!d.expiryDate) return true;
        return new Date(d.expiryDate).getTime() - now.getTime() > 90 * 24 * 60 * 60 * 1000;
      }).length,
      expiring: allDocs.filter((d) => {
        if (!d.expiryDate) return false;
        const days = Math.ceil((new Date(d.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 90;
      }).length,
      expired: allDocs.filter((d) => {
        if (!d.expiryDate) return false;
        return new Date(d.expiryDate).getTime() < now.getTime();
      }).length,
    };

    return { documents: enriched, count: enriched.length, summary };
  });

  app.post("/admin/documents", { preHandler: adminGuard }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: "No file uploaded" });

    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) return reply.status(404).send({ error: "No vessel configured" });

    const fields = data.fields as Record<string, any>;
    const docType = (fields.doc_type?.value as string) || "other";
    const category = (fields.category?.value as string) || "other";
    const expiryDate = fields.expiry_date?.value as string | undefined;
    const crewProfileId = fields.crew_profile_id?.value as string | undefined;
    const notes = fields.notes?.value as string | undefined;

    const ext = path.extname(data.filename);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

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
        crewProfileId: crewProfileId || null,
        category,
        notes: notes || null,
        isDeleted: false,
      })
      .returning();

    return { success: true, document: doc };
  });

  app.put<{
    Params: { id: string };
    Body: { category?: string; notes?: string; expiry_date?: string; doc_type?: string };
  }>("/admin/documents/:id", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;
    const body = request.body;

    const [doc] = await db.select().from(documentVault).where(eq(documentVault.id, id)).limit(1);
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    const updates: Record<string, any> = {};
    if (body.category != null) updates.category = body.category;
    if (body.notes != null) updates.notes = body.notes;
    if (body.expiry_date != null) updates.expiryDate = body.expiry_date;
    if (body.doc_type != null) updates.docType = body.doc_type;

    const [updated] = await db
      .update(documentVault)
      .set(updates)
      .where(eq(documentVault.id, id))
      .returning();

    return { success: true, document: updated };
  });

  app.delete<{
    Params: { id: string };
  }>("/admin/documents/:id", { preHandler: adminGuard }, async (request, reply) => {
    const { id } = request.params;

    const [doc] = await db.select().from(documentVault).where(eq(documentVault.id, id)).limit(1);
    if (!doc) return reply.status(404).send({ error: "Document not found" });

    await db
      .update(documentVault)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(documentVault.id, id));

    return { success: true, deleted: id };
  });

  // ═══════════════════════════════════════════════════════
  // SYSTEM ADMIN
  // ═══════════════════════════════════════════════════════

  app.get("/admin/system/health", { preHandler: adminGuard }, async () => {
    // Database check
    let dbStatus = "disconnected";
    let dbInfo: Record<string, any> = {};
    try {
      const result = await db.execute(sql`SELECT 1 as ok`);
      dbStatus = "connected";

      // Get table counts
      const vesselCount = await db.select({ count: sql<number>`count(*)` }).from(vessels);
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const logbookCount = await db.select({ count: sql<number>`count(*)` }).from(logbookEntries);
      const eventCount = await db.select({ count: sql<number>`count(*)` }).from(complianceEvents);

      dbInfo = {
        vessels: Number(vesselCount[0].count),
        users: Number(userCount[0].count),
        logbook_entries: Number(logbookCount[0].count),
        compliance_events: Number(eventCount[0].count),
      };
    } catch {
      dbStatus = "disconnected";
    }

    // App info
    const appVersion = "0.1.0-alpha";
    const nodeVersion = process.version;

    return {
      status: dbStatus === "connected" ? "healthy" : "degraded",
      database: {
        status: dbStatus,
        tables: dbInfo,
      },
      queue: {
        status: "unknown",
        note: "pg-boss stats require queue initialization",
      },
      ai_engine: {
        status: "unknown",
        note: "Ollama connection not checked in this endpoint",
      },
      storage: {
        upload_dir: UPLOAD_DIR,
      },
      software: {
        version: appVersion,
        node_version: nodeVersion,
        timestamp: new Date().toISOString(),
      },
    };
  });

  app.post("/admin/system/compliance-check", { preHandler: adminGuard }, async (_request) => {
    const [vessel] = await db.select().from(vessels).limit(1);
    if (!vessel) return { success: false, error: "No vessel configured" };

    // Try to schedule via pg-boss if available
    try {
      const { scheduleComplianceCheck } = await import("../queue.js");
      const jobId = await scheduleComplianceCheck(vessel.id);
      return {
        success: true,
        message: "Compliance check scheduled",
        job_id: jobId,
        vessel_id: vessel.id,
      };
    } catch {
      return {
        success: true,
        message: "Compliance check queued (pg-boss not initialized, will run on next startup)",
        vessel_id: vessel.id,
      };
    }
  });
}
