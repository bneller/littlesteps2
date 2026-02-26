import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClassroomSchema, insertChildSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/classrooms", async (_req, res) => {
    const classrooms = await storage.getClassrooms();
    res.json(classrooms);
  });

  app.post("/api/classrooms", async (req, res) => {
    const parsed = insertClassroomSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const classroom = await storage.createClassroom(parsed.data);
    res.status(201).json(classroom);
  });

  app.patch("/api/classrooms/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const parsed = insertClassroomSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const updated = await storage.updateClassroom(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/classrooms/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await storage.deleteClassroom(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(204).send();
  });

  app.get("/api/children", async (_req, res) => {
    const children = await storage.getChildren();
    res.json(children);
  });

  app.post("/api/children", async (req, res) => {
    const parsed = insertChildSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const child = await storage.createChild(parsed.data);
    res.status(201).json(child);
  });

  app.patch("/api/children/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const parsed = insertChildSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const updated = await storage.updateChild(id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/children/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });

    const deleted = await storage.deleteChild(id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(204).send();
  });

  return httpServer;
}
