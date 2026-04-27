import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const calibrationsTable = pgTable("calibrations", {
  id: serial("id").primaryKey(),
  formType: text("form_type").notNull(),
  tagNo: text("tag_no"),
  date: text("date"),
  calibratedBy: text("calibrated_by"),
  userId: integer("user_id"),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCalibrationSchema = createInsertSchema(calibrationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCalibration = z.infer<typeof insertCalibrationSchema>;
export type Calibration = typeof calibrationsTable.$inferSelect;
