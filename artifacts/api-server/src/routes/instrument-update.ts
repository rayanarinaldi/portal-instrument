import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const router = Router();

type AnyRow = Record<string, any>;

function rowsOf(result: any): AnyRow[] {
  if (Array.isArray(result)) return result as AnyRow[];
  if (Array.isArray(result?.rows)) return result.rows as AnyRow[];
  return [];
}

function firstOf(result: any): AnyRow | null {
  return rowsOf(result)[0] ?? null;
}

function toInt(value: unknown): number | null {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function badRequest(res: any, message: string) {
  return res.status(400).json({ error: message });
}

/* =========================
   MASTER: PLANT AREA
========================= */
router.get("/plant-areas", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, name, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM plant_areas
      ORDER BY name ASC
    `);
    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST PLANT AREAS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/plant-areas", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().toUpperCase();
    if (!name) return badRequest(res, "Nama Plant Area wajib diisi");

    const result = await db.execute(sql`
      INSERT INTO plant_areas (name)
      VALUES (${name})
      ON CONFLICT (name) DO UPDATE SET updated_at = now()
      RETURNING id, name, created_at AS "createdAt", updated_at AS "updatedAt"
    `);
    res.status(201).json(firstOf(result));
  } catch (error: any) {
    console.error("CREATE PLANT AREA ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   MASTER: SUB AREA
========================= */
router.get("/sub-areas", async (req, res) => {
  try {
    const plantArea = String(req.query.plantArea || "").trim().toUpperCase();
    const plantAreaId = toInt(req.query.plantAreaId);

    const result = plantAreaId
      ? await db.execute(sql`
          SELECT sa.id, sa.plant_area_id AS "plantAreaId", pa.name AS "plantArea", sa.name,
                 sa.created_at AS "createdAt", sa.updated_at AS "updatedAt"
          FROM sub_areas sa
          JOIN plant_areas pa ON pa.id = sa.plant_area_id
          WHERE sa.plant_area_id = ${plantAreaId}
          ORDER BY sa.name ASC
        `)
      : plantArea
        ? await db.execute(sql`
            SELECT sa.id, sa.plant_area_id AS "plantAreaId", pa.name AS "plantArea", sa.name,
                   sa.created_at AS "createdAt", sa.updated_at AS "updatedAt"
            FROM sub_areas sa
            JOIN plant_areas pa ON pa.id = sa.plant_area_id
            WHERE pa.name = ${plantArea}
            ORDER BY sa.name ASC
          `)
        : await db.execute(sql`
            SELECT sa.id, sa.plant_area_id AS "plantAreaId", pa.name AS "plantArea", sa.name,
                   sa.created_at AS "createdAt", sa.updated_at AS "updatedAt"
            FROM sub_areas sa
            JOIN plant_areas pa ON pa.id = sa.plant_area_id
            ORDER BY pa.name ASC, sa.name ASC
          `);

    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST SUB AREAS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/sub-areas", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().toUpperCase();
    const plantArea = String(req.body?.plantArea || "").trim().toUpperCase();
    const plantAreaId = toInt(req.body?.plantAreaId);

    if (!name) return badRequest(res, "Nama Sub Area wajib diisi");

    let resolvedPlantAreaId = plantAreaId;
    if (!resolvedPlantAreaId) {
      if (!plantArea) return badRequest(res, "Plant Area wajib diisi");
      const plant = await db.execute(sql`
        INSERT INTO plant_areas (name)
        VALUES (${plantArea})
        ON CONFLICT (name) DO UPDATE SET updated_at = now()
        RETURNING id
      `);
      resolvedPlantAreaId = Number(firstOf(plant)?.id);
    }

    const result = await db.execute(sql`
      INSERT INTO sub_areas (plant_area_id, name)
      VALUES (${resolvedPlantAreaId}, ${name})
      ON CONFLICT (plant_area_id, name) DO UPDATE SET updated_at = now()
      RETURNING id, plant_area_id AS "plantAreaId", name, created_at AS "createdAt", updated_at AS "updatedAt"
    `);
    res.status(201).json(firstOf(result));
  } catch (error: any) {
    console.error("CREATE SUB AREA ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   MASTER: EQUIPMENT
========================= */
router.get("/preventive-equipment", async (req, res) => {
  try {
    const plantArea = String(req.query.plantArea || "").trim().toUpperCase();
    const subArea = String(req.query.subArea || "").trim().toUpperCase();

    const result = await db.execute(sql`
      SELECT e.id, e.plant_area_id AS "plantAreaId", pa.name AS "plantArea",
             e.sub_area_id AS "subAreaId", sa.name AS "subArea",
             e.equipment_service AS "equipmentService", e.tag_no AS "tagNo",
             e.created_at AS "createdAt", e.updated_at AS "updatedAt"
      FROM preventive_equipment e
      JOIN plant_areas pa ON pa.id = e.plant_area_id
      JOIN sub_areas sa ON sa.id = e.sub_area_id
      WHERE (${plantArea} = '' OR pa.name = ${plantArea})
        AND (${subArea} = '' OR sa.name = ${subArea})
      ORDER BY pa.name ASC, sa.name ASC, e.tag_no ASC
    `);

    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST EQUIPMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/preventive-equipment", async (req, res) => {
  try {
    const plantArea = String(req.body?.plantArea || "").trim().toUpperCase();
    const subArea = String(req.body?.subArea || "").trim().toUpperCase();
    const equipmentService = String(req.body?.equipmentService || "").trim().toUpperCase();
    const tagNo = String(req.body?.tagNo || "").trim().toUpperCase();

    if (!plantArea || !subArea || !equipmentService || !tagNo) {
      return badRequest(res, "Plant Area, Sub Area, Equipment Service, dan Tag No wajib diisi");
    }

    const plant = await db.execute(sql`
      INSERT INTO plant_areas (name)
      VALUES (${plantArea})
      ON CONFLICT (name) DO UPDATE SET updated_at = now()
      RETURNING id
    `);
    const plantAreaId = Number(firstOf(plant)?.id);

    const sub = await db.execute(sql`
      INSERT INTO sub_areas (plant_area_id, name)
      VALUES (${plantAreaId}, ${subArea})
      ON CONFLICT (plant_area_id, name) DO UPDATE SET updated_at = now()
      RETURNING id
    `);
    const subAreaId = Number(firstOf(sub)?.id);

    const result = await db.execute(sql`
      INSERT INTO preventive_equipment (plant_area_id, sub_area_id, equipment_service, tag_no)
      VALUES (${plantAreaId}, ${subAreaId}, ${equipmentService}, ${tagNo})
      ON CONFLICT (tag_no) DO UPDATE SET
        plant_area_id = excluded.plant_area_id,
        sub_area_id = excluded.sub_area_id,
        equipment_service = excluded.equipment_service,
        updated_at = now()
      RETURNING id, plant_area_id AS "plantAreaId", sub_area_id AS "subAreaId",
                equipment_service AS "equipmentService", tag_no AS "tagNo",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `);

    res.status(201).json(firstOf(result));
  } catch (error: any) {
    console.error("CREATE EQUIPMENT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   PREVENTIVE CHECKLIST + ISSUE
========================= */
router.get("/preventive-checklists", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, checklist_date AS "date", plant_area AS "plantArea", sub_area AS "subArea",
             checked_by AS "checkedBy", checked_by_user_id AS "checkedByUserId",
             issue_count AS "issueCount", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM preventive_checklists
      ORDER BY checklist_date DESC, id DESC
    `);
    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST CHECKLIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/preventive-checklists/:id", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    if (!id) return badRequest(res, "ID tidak valid");

    const header = firstOf(await db.execute(sql`
      SELECT id, checklist_date AS "date", plant_area AS "plantArea", sub_area AS "subArea",
             checked_by AS "checkedBy", checked_by_user_id AS "checkedByUserId",
             issue_count AS "issueCount", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM preventive_checklists
      WHERE id = ${id}
    `));

    if (!header) return res.status(404).json({ error: "Checklist tidak ditemukan" });

    const items = rowsOf(await db.execute(sql`
      SELECT id, checklist_id AS "checklistId", equipment_id AS "equipmentId",
             tag_no AS "tagNo", equipment_service AS "equipmentService",
             dcs_condition AS "dcs", field_condition AS "field", remark
      FROM preventive_checklist_items
      WHERE checklist_id = ${id}
      ORDER BY id ASC
    `));

    res.json({ ...header, items });
  } catch (error: any) {
    console.error("GET CHECKLIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/preventive-checklists", async (req, res) => {
  try {
    const body = req.body || {};
    const date = String(body.date || "").trim();
    const plantArea = String(body.plantArea || "").trim().toUpperCase();
    const subArea = String(body.subArea || "").trim().toUpperCase();
    const checkedBy = String(body.checkedBy || "").trim();
    const checkedByUserId = toInt(body.checkedByUserId ?? body.userId);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!date || !plantArea || !subArea || !checkedBy) {
      return badRequest(res, "Date, Plant Area, Sub Area, dan Checked By wajib diisi");
    }

    const issueCount = items.reduce((count: number, item: any) => {
      return count + (["C", "D", "E"].includes(item.dcs) ? 1 : 0) + (["C", "D", "E"].includes(item.field) ? 1 : 0);
    }, 0);

    const created = firstOf(await db.execute(sql`
      INSERT INTO preventive_checklists (checklist_date, plant_area, sub_area, checked_by, checked_by_user_id, issue_count)
      VALUES (${date}, ${plantArea}, ${subArea}, ${checkedBy}, ${checkedByUserId}, ${issueCount})
      RETURNING id, checklist_date AS "date", plant_area AS "plantArea", sub_area AS "subArea",
                checked_by AS "checkedBy", checked_by_user_id AS "checkedByUserId", issue_count AS "issueCount",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `));

    const checklistId = Number(created?.id);

    for (const item of items) {
      const equipmentId = toInt(item.equipmentId);
      const tagNo = String(item.tagNo || "").trim().toUpperCase();
      const equipmentService = String(item.equipmentService || "").trim().toUpperCase();
      const dcs = String(item.dcs || "A").trim().toUpperCase();
      const field = String(item.field || "A").trim().toUpperCase();
      const remark = String(item.remark || "").trim();

      await db.execute(sql`
        INSERT INTO preventive_checklist_items
          (checklist_id, equipment_id, tag_no, equipment_service, dcs_condition, field_condition, remark)
        VALUES (${checklistId}, ${equipmentId}, ${tagNo}, ${equipmentService}, ${dcs}, ${field}, ${remark})
      `);

      if (["C", "D", "E"].includes(dcs)) {
        await db.execute(sql`
          INSERT INTO preventive_issues
            (checklist_id, issue_date, plant_area, sub_area, equipment_id, tag_no, equipment_service, source, condition, remark, checked_by, checked_by_user_id, status)
          VALUES (${checklistId}, ${date}, ${plantArea}, ${subArea}, ${equipmentId}, ${tagNo}, ${equipmentService}, 'DCS/PANEL', ${dcs}, ${remark}, ${checkedBy}, ${checkedByUserId}, 'OPEN')
        `);
      }
      if (["C", "D", "E"].includes(field)) {
        await db.execute(sql`
          INSERT INTO preventive_issues
            (checklist_id, issue_date, plant_area, sub_area, equipment_id, tag_no, equipment_service, source, condition, remark, checked_by, checked_by_user_id, status)
          VALUES (${checklistId}, ${date}, ${plantArea}, ${subArea}, ${equipmentId}, ${tagNo}, ${equipmentService}, 'FIELD', ${field}, ${remark}, ${checkedBy}, ${checkedByUserId}, 'OPEN')
        `);
      }
    }

    res.status(201).json(created);
  } catch (error: any) {
    console.error("CREATE CHECKLIST ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/preventive-issues", async (req, res) => {
  try {
    const status = String(req.query.status || "").trim().toUpperCase();
    const result = await db.execute(sql`
      SELECT id, checklist_id AS "checklistId", issue_date AS "date", plant_area AS "plantArea",
             sub_area AS "subArea", equipment_id AS "equipmentId", tag_no AS "tagNo",
             equipment_service AS "equipmentService", source, condition, remark,
             checked_by AS "checkedBy", checked_by_user_id AS "checkedByUserId",
             status, action_note AS "actionNote", closed_at AS "closedAt",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM preventive_issues
      WHERE (${status} = '' OR status = ${status})
      ORDER BY issue_date DESC, id DESC
    `);
    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST ISSUES ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.patch("/preventive-issues/:id/status", async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const status = String(req.body?.status || "").trim().toUpperCase();
    const actionNote = String(req.body?.actionNote || "").trim();

    if (!id) return badRequest(res, "ID tidak valid");
    if (!["OPEN", "PROGRESS", "CLOSED"].includes(status)) return badRequest(res, "Status tidak valid");

    const result = await db.execute(sql`
      UPDATE preventive_issues
      SET status = ${status},
          action_note = ${actionNote},
          closed_at = CASE WHEN ${status} = 'CLOSED' THEN now() ELSE closed_at END,
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, checklist_id AS "checklistId", issue_date AS "date", plant_area AS "plantArea",
                sub_area AS "subArea", equipment_id AS "equipmentId", tag_no AS "tagNo",
                equipment_service AS "equipmentService", source, condition, remark,
                checked_by AS "checkedBy", status, action_note AS "actionNote", closed_at AS "closedAt",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `);

    const updated = firstOf(result);
    if (!updated) return res.status(404).json({ error: "Issue tidak ditemukan" });
    res.json(updated);
  } catch (error: any) {
    console.error("UPDATE ISSUE STATUS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   DAILY REPORT
========================= */
router.get("/daily-reports", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, report_type AS "reportType", period, department, prepared_by AS "preparedBy",
             approval, activities, planning, notes, created_by_user_id AS "createdByUserId",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM daily_reports
      ORDER BY period DESC, id DESC
    `);
    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST DAILY REPORTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/daily-reports", async (req, res) => {
  try {
    const body = req.body || {};
    const reportType = String(body.reportType || "foreman").trim();
    const period = String(body.period || "").trim();
    const department = String(body.department || "Maintenance Instrument").trim();
    const preparedBy = String(body.preparedBy || "").trim();
    const approval = body.approval ?? null;
    const activities = JSON.stringify(body.activities ?? []);
    const planning = JSON.stringify(body.planning ?? []);
    const notes = body.notes ?? null;
    const userId = toInt(body.createdByUserId ?? body.userId);

    if (!period || !preparedBy) return badRequest(res, "Period dan Prepared wajib diisi");

    const result = await db.execute(sql`
      INSERT INTO daily_reports
        (report_type, period, department, prepared_by, approval, activities, planning, notes, created_by_user_id)
      VALUES (${reportType}, ${period}, ${department}, ${preparedBy}, ${approval}, CAST(${activities} AS jsonb), CAST(${planning} AS jsonb), ${notes}, ${userId})
      RETURNING id, report_type AS "reportType", period, department, prepared_by AS "preparedBy",
                approval, activities, planning, notes, created_by_user_id AS "createdByUserId",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `);
    res.status(201).json(firstOf(result));
  } catch (error: any) {
    console.error("CREATE DAILY REPORT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   LOGSHEET SHIFT
========================= */
router.get("/logsheet-shift", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, logsheet_date AS "date", shift, plant_area AS "plantArea", prepared_by AS "preparedBy",
             items, notes, created_by_user_id AS "createdByUserId", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM logsheet_shift_reports
      ORDER BY logsheet_date DESC, id DESC
    `);
    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST LOGSHEET ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/logsheet-shift", async (req, res) => {
  try {
    const body = req.body || {};
    const date = String(body.date || "").trim();
    const shift = String(body.shift || "").trim();
    const plantArea = String(body.plantArea || "").trim().toUpperCase();
    const preparedBy = String(body.preparedBy || "").trim();
    const items = JSON.stringify(body.items ?? []);
    const notes = body.notes ?? null;
    const userId = toInt(body.createdByUserId ?? body.userId);

    if (!date || !shift || !plantArea || !preparedBy) return badRequest(res, "Date, Shift, Plant Area, dan Prepared By wajib diisi");

    const result = await db.execute(sql`
      INSERT INTO logsheet_shift_reports (logsheet_date, shift, plant_area, prepared_by, items, notes, created_by_user_id)
      VALUES (${date}, ${shift}, ${plantArea}, ${preparedBy}, CAST(${items} AS jsonb), ${notes}, ${userId})
      RETURNING id, logsheet_date AS "date", shift, plant_area AS "plantArea", prepared_by AS "preparedBy",
                items, notes, created_by_user_id AS "createdByUserId", created_at AS "createdAt", updated_at AS "updatedAt"
    `);
    res.status(201).json(firstOf(result));
  } catch (error: any) {
    console.error("CREATE LOGSHEET ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* =========================
   COLLECT DATA
========================= */
router.get("/collect-data", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, collected_at AS "collectedAt", plant_area AS "plantArea", sub_area AS "subArea",
             title, data, created_by AS "createdBy", created_by_user_id AS "createdByUserId",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM collect_data_records
      ORDER BY collected_at DESC, id DESC
    `);
    res.json(rowsOf(result));
  } catch (error: any) {
    console.error("LIST COLLECT DATA ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/collect-data", async (req, res) => {
  try {
    const body = req.body || {};
    const collectedAt = String(body.collectedAt || body.date || "").trim();
    const plantArea = String(body.plantArea || "").trim().toUpperCase();
    const subArea = String(body.subArea || "").trim().toUpperCase();
    const title = String(body.title || "Collect Data").trim();
    const data = JSON.stringify(body.data ?? body.items ?? {});
    const createdBy = String(body.createdBy || body.preparedBy || "").trim();
    const userId = toInt(body.createdByUserId ?? body.userId);

    if (!collectedAt || !plantArea || !subArea || !createdBy) return badRequest(res, "Tanggal, Plant Area, Sub Area, dan Created By wajib diisi");

    const result = await db.execute(sql`
      INSERT INTO collect_data_records (collected_at, plant_area, sub_area, title, data, created_by, created_by_user_id)
      VALUES (${collectedAt}, ${plantArea}, ${subArea}, ${title}, CAST(${data} AS jsonb), ${createdBy}, ${userId})
      RETURNING id, collected_at AS "collectedAt", plant_area AS "plantArea", sub_area AS "subArea",
                title, data, created_by AS "createdBy", created_by_user_id AS "createdByUserId",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `);
    res.status(201).json(firstOf(result));
  } catch (error: any) {
    console.error("CREATE COLLECT DATA ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
