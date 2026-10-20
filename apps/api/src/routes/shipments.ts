import {
  CreateCommentSchema,
  CreateShipmentSchema,
  LogPhaseSchema,
  UpdateShipmentSchema,
} from "@laneclock/shared";
import { Router } from "express";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { createTrackingToken, hashToken } from "../lib/tokens.js";
import {
  ensureDefaultPhases,
  recomputeShipmentMetrics,
  statusForPhase,
} from "../services/clock.js";
import { evaluateShipmentExceptions } from "../services/exceptions.js";
import { param } from "../lib/params.js";
import {
  requireApprovedClient,
  requireAuth,
  requireRoles,
  type AuthedRequest,
} from "../middleware/auth.js";

export const shipmentsRouter = Router();

const shipmentInclude = {
  phases: { orderBy: { phase: "asc" as const } },
  originLocation: true,
  destinationLocation: true,
  carrier: true,
  lane: true,
  customerOrg: true,
  assignee: { select: { id: true, name: true, email: true } },
  documents: true,
  exceptions: { orderBy: { createdAt: "desc" as const } },
  invoice: true,
  _count: { select: { comments: true } },
};

function scopeWhere(req: AuthedRequest) {
  if (!req.membership) return { id: "__none__" };
  if (req.membership.role === "CLIENT") {
    return { customerOrgId: req.membership.organizationId };
  }
  return { tenantOrgId: req.membership.organizationId };
}

shipmentsRouter.get("/", requireAuth, requireApprovedClient, async (req: AuthedRequest, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const shipments = await prisma.shipment.findMany({
    where: {
      ...scopeWhere(req),
      ...(status ? { status: status as never } : {}),
      ...(q
        ? {
            OR: [
              { referenceCode: { contains: q, mode: "insensitive" } },
              { commodity: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: shipmentInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ shipments });
});

shipmentsRouter.get("/:id", requireAuth, requireApprovedClient, async (req: AuthedRequest, res) => {
  const shipment = await prisma.shipment.findFirst({
    where: { id: param(req, "id"), ...scopeWhere(req) },
    include: {
      ...shipmentInclude,
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!shipment) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  res.json({ shipment });
});

shipmentsRouter.post(
  "/",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateShipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const data = parsed.data;
    const tenantOrgId = req.membership!.organizationId;
    const count = await prisma.shipment.count({ where: { tenantOrgId } });
    const referenceCode = `LC-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    const token = createTrackingToken();

    const shipment = await prisma.$transaction(async (tx) => {
      const created = await tx.shipment.create({
        data: {
          tenantOrgId,
          customerOrgId: data.customerOrgId,
          carrierId: data.carrierId ?? undefined,
          laneId: data.laneId ?? undefined,
          referenceCode,
          mode: data.mode,
          originLocationId: data.originLocationId,
          destinationLocationId: data.destinationLocationId,
          promisedEtd: data.promisedEtd ? new Date(data.promisedEtd) : undefined,
          promisedEta: data.promisedEta ? new Date(data.promisedEta) : undefined,
          weightKg: data.weightKg ?? undefined,
          packageCount: data.packageCount ?? undefined,
          containerCount: data.containerCount ?? undefined,
          commodity: data.commodity ?? undefined,
          hazmat: data.hazmat ?? false,
          assigneeId: data.assigneeId ?? req.userId,
          notes: data.notes ?? undefined,
          trackingTokenHash: token.hash,
          trackingTokenHint: token.hint,
        },
      });
      await ensureDefaultPhases(
        created.id,
        created.promisedEtd,
        created.promisedEta,
        tx
      );
      return created;
    });

    await writeAudit({
      organizationId: tenantOrgId,
      actorId: req.userId,
      action: "shipment.created",
      entityType: "Shipment",
      entityId: shipment.id,
      summary: `Created ${referenceCode}`,
      after: { referenceCode, status: shipment.status },
    });

    const full = await recomputeShipmentMetrics(shipment.id);
    res.status(201).json({
      shipment: full,
      trackingToken: token.raw,
    });
  }
);

shipmentsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = UpdateShipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const existing = await prisma.shipment.findFirst({
      where: { id: param(req, "id"), ...scopeWhere(req) },
    });
    if (!existing) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

    const data = parsed.data;
    const before = {
      status: existing.status,
      promisedEta: existing.promisedEta,
      assigneeId: existing.assigneeId,
      holdReason: existing.holdReason,
    };

    const updated = await prisma.shipment.update({
      where: { id: existing.id },
      data: {
        ...(data.status !== undefined
          ? {
              status: data.status,
              holdStartedAt:
                data.status === "ON_HOLD"
                  ? existing.holdStartedAt ?? new Date()
                  : null,
            }
          : {}),
        ...(data.holdReason !== undefined ? { holdReason: data.holdReason } : {}),
        ...(data.delayReason !== undefined ? { delayReason: data.delayReason } : {}),
        ...(data.inFull !== undefined ? { inFull: data.inFull } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.carrierId !== undefined ? { carrierId: data.carrierId } : {}),
        ...(data.laneId !== undefined ? { laneId: data.laneId } : {}),
        ...(data.promisedEta !== undefined
          ? { promisedEta: data.promisedEta ? new Date(data.promisedEta) : null }
          : {}),
        ...(data.promisedEtd !== undefined
          ? { promisedEtd: data.promisedEtd ? new Date(data.promisedEtd) : null }
          : {}),
        ...(data.commodity !== undefined ? { commodity: data.commodity } : {}),
        ...(data.weightKg !== undefined ? { weightKg: data.weightKg } : {}),
        ...(data.packageCount !== undefined ? { packageCount: data.packageCount } : {}),
        ...(data.containerCount !== undefined ? { containerCount: data.containerCount } : {}),
        ...(data.hazmat !== undefined ? { hazmat: data.hazmat } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    await writeAudit({
      organizationId: existing.tenantOrgId,
      actorId: req.userId,
      action: "shipment.updated",
      entityType: "Shipment",
      entityId: existing.id,
      summary: `Updated ${existing.referenceCode}`,
      before,
      after: {
        status: updated.status,
        promisedEta: updated.promisedEta,
        assigneeId: updated.assigneeId,
        holdReason: updated.holdReason,
      },
    });

    const full = await recomputeShipmentMetrics(existing.id);
    await evaluateShipmentExceptions(existing.id);
    res.json({ shipment: full });
  }
);

shipmentsRouter.post(
  "/:id/phases",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = LogPhaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const existing = await prisma.shipment.findFirst({
      where: { id: param(req, "id"), ...scopeWhere(req) },
    });
    if (!existing) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

    const body = parsed.data;
    const phase = await prisma.shipmentPhase.upsert({
      where: {
        shipmentId_phase: { shipmentId: existing.id, phase: body.phase },
      },
      create: {
        shipmentId: existing.id,
        phase: body.phase,
        actualStartAt: body.actualStartAt ? new Date(body.actualStartAt) : new Date(),
        actualEndAt: body.actualEndAt ? new Date(body.actualEndAt) : undefined,
        locationLabel: body.locationLabel ?? undefined,
        notes: body.notes ?? undefined,
        delayReason: body.delayReason ?? undefined,
        createdById: req.userId,
      },
      update: {
        actualStartAt: body.actualStartAt ? new Date(body.actualStartAt) : new Date(),
        actualEndAt: body.actualEndAt ? new Date(body.actualEndAt) : undefined,
        locationLabel: body.locationLabel ?? undefined,
        notes: body.notes ?? undefined,
        delayReason: body.delayReason ?? undefined,
        createdById: req.userId,
      },
    });

    await prisma.shipment.update({
      where: { id: existing.id },
      data: {
        status: statusForPhase(body.phase) as never,
        ...(body.delayReason ? { delayReason: body.delayReason } : {}),
      },
    });

    await writeAudit({
      organizationId: existing.tenantOrgId,
      actorId: req.userId,
      action: "shipment.phase_logged",
      entityType: "ShipmentPhase",
      entityId: phase.id,
      summary: `Logged phase ${body.phase} on ${existing.referenceCode}`,
      after: {
        phase: body.phase,
        actualStartAt: phase.actualStartAt,
        actualEndAt: phase.actualEndAt,
      },
    });

    // Notify ops/client lightly
    const clientMembers = await prisma.membership.findMany({
      where: { organizationId: existing.customerOrgId, role: "CLIENT" },
    });
    for (const m of clientMembers) {
      await prisma.notification.create({
        data: {
          userId: m.userId,
          title: `Phase update: ${existing.referenceCode}`,
          body: `${body.phase} logged on your shipment.`,
        },
      });
    }

    const full = await recomputeShipmentMetrics(existing.id);
    await evaluateShipmentExceptions(existing.id);
    res.json({ shipment: full, phase });
  }
);

shipmentsRouter.post(
  "/:id/comments",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    const parsed = CreateCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const existing = await prisma.shipment.findFirst({
      where: { id: param(req, "id"), ...scopeWhere(req) },
    });
    if (!existing) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

    const comment = await prisma.shipmentComment.create({
      data: {
        shipmentId: existing.id,
        authorId: req.userId!,
        body: parsed.data.body,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    res.status(201).json({ comment });
  }
);

shipmentsRouter.post(
  "/:id/tracking-token",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const existing = await prisma.shipment.findFirst({
      where: { id: param(req, "id"), ...scopeWhere(req) },
    });
    if (!existing) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
    const token = createTrackingToken();
    await prisma.shipment.update({
      where: { id: existing.id },
      data: { trackingTokenHash: token.hash, trackingTokenHint: token.hint },
    });
    await writeAudit({
      organizationId: existing.tenantOrgId,
      actorId: req.userId,
      action: "shipment.tracking_regenerated",
      entityType: "Shipment",
      entityId: existing.id,
      summary: `Regenerated tracking link for ${existing.referenceCode}`,
    });
    res.json({ trackingToken: token.raw, hint: token.hint });
  }
);

shipmentsRouter.get(
  "/:id/export-row",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    const shipment = await prisma.shipment.findFirst({
      where: { id: param(req, "id"), ...scopeWhere(req) },
      include: { carrier: true, lane: true },
    });
    if (!shipment) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
    res.json({ shipment });
  }
);

// document seed attach
shipmentsRouter.post(
  "/:id/documents",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const existing = await prisma.shipment.findFirst({
      where: { id: param(req, "id"), ...scopeWhere(req) },
    });
    if (!existing) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
    const { name, type } = req.body as { name?: string; type?: string };
    const doc = await prisma.document.create({
      data: {
        shipmentId: existing.id,
        name: name ?? "Document.pdf",
        type: (type as never) ?? "OTHER",
        mimeType: "application/pdf",
        storageKey: `seeded/${existing.referenceCode}/${Date.now()}.pdf`,
        sizeBytes: 12_000,
      },
    });
    await writeAudit({
      organizationId: existing.tenantOrgId,
      actorId: req.userId,
      action: "shipment.document_added",
      entityType: "Document",
      entityId: doc.id,
      summary: `Added document ${doc.name} to ${existing.referenceCode}`,
      after: { name: doc.name, type: doc.type },
    });
    if (doc.type === "POD") {
      await evaluateShipmentExceptions(existing.id);
    }
    res.status(201).json({ document: doc });
  }
);

export { hashToken };
