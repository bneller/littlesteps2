import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  classrooms,
  children,
  type Classroom,
  type InsertClassroom,
  type Child,
  type InsertChild,
} from "@shared/schema";

export interface IStorage {
  getClassrooms(): Promise<Classroom[]>;
  getClassroom(id: number): Promise<Classroom | undefined>;
  createClassroom(classroom: InsertClassroom): Promise<Classroom>;
  updateClassroom(id: number, classroom: Partial<InsertClassroom>): Promise<Classroom | undefined>;
  deleteClassroom(id: number): Promise<boolean>;

  getChildren(): Promise<Child[]>;
  getChild(id: number): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: number, child: Partial<InsertChild>): Promise<Child | undefined>;
  deleteChild(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getClassrooms(): Promise<Classroom[]> {
    return await db.select().from(classrooms);
  }

  async getClassroom(id: number): Promise<Classroom | undefined> {
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, id));
    return classroom;
  }

  async createClassroom(classroom: InsertClassroom): Promise<Classroom> {
    const [created] = await db.insert(classrooms).values(classroom).returning();
    return created;
  }

  async updateClassroom(id: number, data: Partial<InsertClassroom>): Promise<Classroom | undefined> {
    const [updated] = await db.update(classrooms).set(data).where(eq(classrooms.id, id)).returning();
    return updated;
  }

  async deleteClassroom(id: number): Promise<boolean> {
    const result = await db.delete(classrooms).where(eq(classrooms.id, id)).returning();
    return result.length > 0;
  }

  async getChildren(): Promise<Child[]> {
    return await db.select().from(children);
  }

  async getChild(id: number): Promise<Child | undefined> {
    const [child] = await db.select().from(children).where(eq(children.id, id));
    return child;
  }

  async createChild(child: InsertChild): Promise<Child> {
    const [created] = await db.insert(children).values(child).returning();
    return created;
  }

  async updateChild(id: number, data: Partial<InsertChild>): Promise<Child | undefined> {
    const [updated] = await db.update(children).set(data).where(eq(children.id, id)).returning();
    return updated;
  }

  async deleteChild(id: number): Promise<boolean> {
    const result = await db.delete(children).where(eq(children.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
