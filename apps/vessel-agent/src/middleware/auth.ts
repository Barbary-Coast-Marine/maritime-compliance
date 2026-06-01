import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const AUTH_SECRET = process.env.AUTH_SECRET
  ?? (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("AUTH_SECRET must be set in production"); })()
    : "maritime-dev-secret");

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  vesselId: string | null;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

export function getAuthSecret(): string {
  return AUTH_SECRET;
}

export async function authPreHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, AUTH_SECRET) as AuthUser;
    request.user = payload;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}
