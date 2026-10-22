import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.get("/", requireAuth, requireRoles("ADMIN", "OPS"), async (req: AuthedRequest, res) => {
  const actorId = typeof req.query.actorId === "string" ? req.query.actorId : undefined;
  const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
  const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
  const action = typeof req.query.action === "string" ? req.query.action : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      organizationId: req.membership!.organizationId,
      ...(actorId ? { actorId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
      ...(action ? { action: { contains: action, mode: "insensitive" } } : {}),
      ...(q
        ? {
            OR: [
              { summary: { contains: q, mode: "insensitive" } },
              { action: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  res.json({ logs });
});

auditRouter.get(
  "/feed",
  requireAuth,
  async (req: AuthedRequest, res) => {
    if (!req.membership) {
      return res.json({ logs: [] });
    }
    const orgId =
      req.membership.role === "CLIENT"
        ? undefined
        : req.membership.organizationId;

    const logs = await prisma.auditLog.findMany({
      where: orgId
        ? { organizationId: orgId }
        : {
            entityType: "Shipment",
            // client feed: shipments belonging to their org via recent audit on those entities (simplified: tenant audits only for ops)
          },
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    if (req.membership.role === "CLIENT") {
      const shipmentIds = (
        await prisma.shipment.findMany({
          where: { customerOrgId: req.membership.organizationId },
          select: { id: true },
        })
      ).map((s) => s.id);
      const clientLogs = await prisma.auditLog.findMany({
        where: { entityType: "Shipment", entityId: { in: shipmentIds } },
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 40,
      });
      return res.json({ logs: clientLogs });
    }

    res.json({ logs });
  }
);
