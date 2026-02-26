import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  minAgeMonths: integer("min_age_months").notNull(),
  maxAgeMonths: integer("max_age_months").notNull(),
  capacity: integer("capacity").notNull(),
  ratio: text("ratio").notNull(),
});

export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  birthDate: text("birth_date").notNull(),
  enrollmentDate: text("enrollment_date").notNull(),
});

export const insertClassroomSchema = createInsertSchema(classrooms).omit({ id: true });
export const insertChildSchema = createInsertSchema(children).omit({ id: true });

export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type Classroom = typeof classrooms.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Child = typeof children.$inferSelect;
