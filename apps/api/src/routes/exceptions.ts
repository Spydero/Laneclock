import { AcknowledgeExceptionSchema, ResolveExceptionSchema } from "@laneclock/shared";
import { Router } from "express";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireRoles,
  type AuthedRequest,
} from "../middleware/auth.js";
import { evaluateAllOpenShipments } from "../services/exceptions.js";
import { param } from "../lib/params.js";

export const exceptionsRouter = Router();

exceptionsRouter.get(
  "/",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const severity = typeof req.query.severity === "string" ? req.query.severity : undefined;
    const exceptions = await prisma.exception.findMany({
      where: {
        shipment: { tenantOrgId: req.membership!.organizationId },
        ...(status ? { status: status as never } : { status: { in: ["OPEN", "ACKNOWLEDGED"] } }),
        ...(severity ? { severity: severity as never } : {}),
      },
      include: {
        shipment: {
          select: {
            id: true,
            referenceCode: true,
            status: true,
            promisedEta: true,
            carrier: { select: { name: true } },
          },
        },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    res.json({ exceptions });
  }
);

exceptionsRouter.get(
  "/at-risk",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const exceptions = await prisma.exception.findMany({
      where: {
        type: "AT_RISK",
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        shipment: { tenantOrgId: req.membership!.organizationId },
      },
      include: {
        shipment: {
          select: {
            id: true,
            referenceCode: true,
            status: true,
            promisedEta: true,
            cycleTimeHours: true,
            transitHours: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ exceptions });
  }
);

exceptionsRouter.post(
  "/evaluate",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (_req, res) => {
    await evaluateAllOpenShipments();
    res.json({ ok: true });
  }
);

exceptionsRouter.post(
  "/:id/acknowledge",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = AcknowledgeExceptionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const ex = await prisma.exception.findFirst({
      where: {
        id: param(req, "id"),
        shipment: { tenantOrgId: req.membership!.organizationId },
      },
      include: { shipment: true },
    });
    if (!ex) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

    const updated = await prisma.exception.update({
      where: { id: ex.id },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
        resolveNote: parsed.data.note,
      },
    });
    await writeAudit({
      organizationId: ex.shipment.tenantOrgId,
      actorId: req.userId,
      action: "exception.acknowledged",
      entityType: "Exception",
      entityId: ex.id,
      summary: `Acknowledged ${ex.type} on ${ex.shipment.referenceCode}`,
      before: { status: ex.status },
      after: { status: updated.status },
    });
    res.json({ exception: updated });
  }
);

exceptionsRouter.post(
  "/:id/resolve",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = ResolveExceptionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const ex = await prisma.exception.findFirst({
      where: {
        id: param(req, "id"),
        shipment: { tenantOrgId: req.membership!.organizationId },
      },
      include: { shipment: true },
    });
    if (!ex) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

    const updated = await prisma.exception.update({
      where: { id: ex.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedById: req.userId,
        resolveNote: parsed.data.note,
      },
    });
    await writeAudit({
      organizationId: ex.shipment.tenantOrgId,
      actorId: req.userId,
      action: "exception.resolved",
      entityType: "Exception",
      entityId: ex.id,
      summary: `Resolved ${ex.type} on ${ex.shipment.referenceCode}`,
      before: { status: ex.status },
      after: { status: updated.status, note: parsed.data.note },
    });
    res.json({ exception: updated });
  }
);
