import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.SESSION_SECRET || "dongjin-secret-key";

export interface JwtPayload {
  userId: number;
  username: string;
  name: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function authenticateMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const token = auth.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function seedInitialUser(): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, "rayanarinaldi"))
      .limit(1);

    if (existing.length > 0) return;

    const hashed = await hashPassword("L@crhym0se");

    await db.insert(usersTable).values({
      name: "Rayana Rinaldi",
      username: "rayanarinaldi",
      password: hashed,
      role: "admin_it",
    });
  } catch (err) {
    console.error("Failed to seed initial user:", err);
  }
}