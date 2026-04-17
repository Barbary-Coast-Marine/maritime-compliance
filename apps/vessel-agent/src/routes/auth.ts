import { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { users, type Database } from "@maritime/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authPreHandler, getAuthSecret, type AuthUser } from "../middleware/auth.js";

export async function authRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * POST /api/auth/login
   * Authenticate user and return JWT token
   */
  app.post<{
    Body: { username: string; password: string };
  }>("/auth/login", async (request, reply) => {
    const { username, password } = request.body;

    if (!username || !password) {
      return reply.status(400).send({ error: "Username and password are required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const payload: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      vesselId: user.vesselId,
    };

    const token = jwt.sign(payload, getAuthSecret(), { expiresIn: "7d" });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        vesselId: user.vesselId,
        email: user.email,
        phone: user.phone,
      },
    };
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  app.get("/auth/me", { preHandler: authPreHandler }, async (request) => {
    const [dbUser] = await db.select().from(users).where(eq(users.id, request.user!.id)).limit(1);
    return {
      user: {
        id: dbUser.id,
        username: dbUser.username,
        displayName: dbUser.displayName,
        role: dbUser.role,
        vesselId: dbUser.vesselId,
        email: dbUser.email,
        phone: dbUser.phone,
      }
    };
  });

  /**
   * POST /api/auth/register
   * Create a new user (for initial setup)
   */
  app.post<{
    Body: {
      username: string;
      password: string;
      role: "captain" | "engineer" | "crew" | "fleet_manager";
      vesselId?: string;
    };
  }>("/auth/register", async (request, reply) => {
    const { username, password, role, vesselId } = request.body;

    if (!username || !password || !role) {
      return reply.status(400).send({ error: "Username, password, and role are required" });
    }

    const normalizedUsername = username.toLowerCase().trim();

    // Check if username already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (existing) {
      return reply.status(409).send({ error: "Username already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        username: normalizedUsername,
        passwordHash,
        role,
        vesselId: vesselId ?? null,
      })
      .returning();

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        vesselId: user.vesselId,
      },
    };
  });
}
