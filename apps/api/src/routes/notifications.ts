import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../lib/params.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ notifications });
});

notificationsRouter.post("/:id/read", requireAuth, async (req: AuthedRequest, res) => {
  const n = await prisma.notification.findFirst({
    where: { id: param(req, "id"), userId: req.userId! },
  });
  if (!n) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  const updated = await prisma.notification.update({
    where: { id: n.id },
    data: { readAt: new Date() },
  });
  res.json({ notification: updated });
});

notificationsRouter.post("/read-all", requireAuth, async (req: AuthedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.userId!, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
});
