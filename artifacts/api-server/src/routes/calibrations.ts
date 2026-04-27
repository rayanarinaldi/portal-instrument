import { Router } from "express";
import { db, calibrationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

/* =========================
   CREATE
========================= */
router.post("/calibrations", async (req, res) => {
  try {
    const body = req.body;

    // 🔥 TAMBAHAN: AUTO DUE DATE
    let dataWithDue = body.data || {};

// 🔥 TAMBAHAN interval per equipment
const intervalMap: Record<string, number> = {
  "Control Valve": 12,
  "Timbangan": 6,
  "RTD": 6,
  "Transmitter": 6,
  "pH": 3,
};

const months = intervalMap[body.formType] || 6;

if (body.date) {
  const dueDate = new Date(body.date);
  dueDate.setMonth(dueDate.getMonth() + months);

  dataWithDue = {
    ...dataWithDue,
    calDueDate: dueDate.toISOString().slice(0, 10),
  };
}

    if (body.date) {
      const dueDate = new Date(body.date);
      dueDate.setMonth(dueDate.getMonth() + 6);

      dataWithDue = {
        ...dataWithDue,
        calDueDate: dueDate.toISOString().slice(0, 10),
      };
    }

    const [result] = await db
      .insert(calibrationsTable)
      .values({
        formType: body.formType,
        tagNo: body.tagNo,
        date: body.date,
        calibratedBy: body.calibratedBy,
        data: dataWithDue, // 🔥 pakai yang sudah ditambah due date
        userId: Number(body.userId) || 3,
        createdAt: new Date(),
      } as any)
      .returning();

    res.json(result);
  } catch (error: any) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   GET BY ID
========================= */
router.get("/calibrations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [record] = await db
      .select()
      .from(calibrationsTable)
      .where(eq(calibrationsTable.id, id));

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(record);
  } catch (error: any) {
    console.error("GET ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   LIST
========================= */
router.get("/calibrations", async (_req, res) => {
  try {
    const records = await db
      .select()
      .from(calibrationsTable)
      .orderBy(desc(calibrationsTable.createdAt));

    res.json(records);
  } catch (error: any) {
    console.error("LIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   PUBLIC HISTORY
========================= */
router.get("/public/history/:tagNo", async (req, res) => {
  try {
    const tagNo = String(req.params.tagNo || "").trim().toLowerCase();

    const records = await db
      .select()
      .from(calibrationsTable)
      .orderBy(desc(calibrationsTable.date));

    const filtered = records.filter(
      (r: any) => String(r.tagNo || "").trim().toLowerCase() === tagNo
    );

    res.json(filtered);
  } catch (error: any) {
    console.error("PUBLIC HISTORY ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   UPDATE
========================= */
router.put("/calibrations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID tidak valid" });
    }

    let dataWithDue = body.data || {};

    const intervalMap: Record<string, number> = {
      control_valve: 12,
      timbangan: 6,
      rtd: 6,
      transmitter: 6,
      ph: 3,
    };

    const interval = intervalMap[body.formType];

    if (body.date && interval) {
      const date = new Date(body.date);
      date.setMonth(date.getMonth() + interval);

      dataWithDue = {
        ...dataWithDue,
        calDueDate: date.toISOString().slice(0, 10),
      };
    }

    const [updated] = await db
      .update(calibrationsTable)
      .set({
        formType: body.formType,
        tagNo: body.tagNo,
        date: body.date,
        calibratedBy: body.calibratedBy,
        data: dataWithDue,
      } as any)
      .where(eq(calibrationsTable.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Data tidak ditemukan" });
    }

    res.json(updated);
  } catch (error: any) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({
      error: "Failed to update",
      detail: error?.message || String(error),
    });
  }
});

/* =========================
   DELETE
========================= */
router.delete("/calibrations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await db
      .delete(calibrationsTable)
      .where(eq(calibrationsTable.id, id))
      .returning();

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Data tidak ditemukan" });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({
      error: "Failed to delete",
      detail: error?.message || String(error),
    });
  }
});

export default router;