import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { comparePassword, hashPassword, signToken } from "../lib/auth.js";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as Record<string, string>;

  if (!username || !password) {
    res.status(400).json({ error: "Username dan password wajib diisi" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "User tidak ditemukan" });
    return;
  }

  const valid = await comparePassword(password, user.password);

  if (!valid) {
    res.status(401).json({ error: "Password salah" });
    return;
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  res.json({ ok: true });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable);

  res.json(users);
});

router.post("/users", async (req, res): Promise<void> => {
  const { name, username, password, role } = req.body as Record<string, string>;

  if (!name || !username || !password || !role) {
    res.status(400).json({ error: "Semua field wajib diisi" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    res.status(400).json({ error: "Username sudah digunakan" });
    return;
  }

  const hashed = await hashPassword(password);

  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      username,
      password: hashed,
      role,
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });

  res.status(201).json(user);
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID tidak valid" });
    return;
  }

  const deleted = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
    });

  if (deleted.length === 0) {
    res.status(404).json({ error: "User tidak ditemukan" });
    return;
  }

  res.json({ success: true });
});

export default router;