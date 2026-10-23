import {
  CreateLaneSchema,
  CreateLocationSchema,
} from "@laneclock/shared";
import { Router } from "express";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../lib/params.js";

export const catalogRouter = Router();

catalogRouter.get("/locations", requireAuth, async (_req, res) => {
  const locations = await prisma.location.findMany({
    orderBy: [{ country: "asc" }, { city: "asc" }, { name: "asc" }],
  });
  res.json({ locations });
});

catalogRouter.post(
  "/locations",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    const code = parsed.data.code.trim().toUpperCase();
    const existing = await prisma.location.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ error: "Location code already exists", code: "CONFLICT" });
    }
    const location = await prisma.location.create({
      data: {
        code,
        name: parsed.data.name.trim(),
        city: parsed.data.city?.trim() || null,
        country: parsed.data.country.trim().toUpperCase(),
        type: parsed.data.type,
      },
    });
    await writeAudit({
      organizationId: req.membership!.organizationId,
      actorId: req.userId,
      action: "location.created",
      entityType: "Location",
      entityId: location.id,
      summary: `Added facility ${location.name}`,
      after: location,
    });
    res.status(201).json({ location });
  }
);

catalogRouter.get("/lanes", requireAuth, async (_req, res) => {
  const lanes = await prisma.lane.findMany({
    where: { active: true },
    include: {
      originLocation: true,
      destinationLocation: true,
    },
    orderBy: { name: "asc" },
  });
  res.json({ lanes });
});

catalogRouter.post(
  "/lanes",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const parsed = CreateLaneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), code: "VALIDATION" });
    }
    if (parsed.data.originLocationId === parsed.data.destinationLocationId) {
      return res.status(400).json({
        error: "Origin and destination must differ",
        code: "VALIDATION",
      });
    }
    const [origin, destination] = await Promise.all([
      prisma.location.findUnique({ where: { id: parsed.data.originLocationId } }),
      prisma.location.findUnique({ where: { id: parsed.data.destinationLocationId } }),
    ]);
    if (!origin || !destination) {
      return res.status(400).json({ error: "Unknown origin or destination", code: "VALIDATION" });
    }
    const name =
      parsed.data.name?.trim() || `${origin.name} → ${destination.name}`;
    const lane = await prisma.lane.create({
      data: {
        name,
        originLocationId: origin.id,
        destinationLocationId: destination.id,
        expectedTransitHours: parsed.data.expectedTransitHours,
        mode: parsed.data.mode,
      },
      include: { originLocation: true, destinationLocation: true },
    });
    await writeAudit({
      organizationId: req.membership!.organizationId,
      actorId: req.userId,
      action: "lane.created",
      entityType: "Lane",
      entityId: lane.id,
      summary: `Added lane ${lane.name}`,
      after: { name: lane.name, mode: lane.mode },
    });
    res.status(201).json({ lane });
  }
);

catalogRouter.get("/carriers", requireAuth, async (_req, res) => {
  const carriers = await prisma.carrier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  res.json({ carriers });
});

catalogRouter.get("/customers", requireAuth, requireRoles("ADMIN", "OPS"), async (req: AuthedRequest, res) => {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { members: { some: { role: "CLIENT" } } },
        { slug: { not: req.membership!.organization.slug } },
      ],
      NOT: { id: req.membership!.organizationId },
    },
    orderBy: { name: "asc" },
  });
  res.json({ customers: orgs });
});

catalogRouter.get("/rate-cards", requireAuth, requireRoles("ADMIN", "OPS"), async (req: AuthedRequest, res) => {
  const rateCards = await prisma.rateCard.findMany({
    where: { organizationId: req.membership!.organizationId, active: true },
    include: { lane: true, carrier: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ rateCards });
});

catalogRouter.get("/invoices", requireAuth, requireRoles("ADMIN", "OPS"), async (req: AuthedRequest, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { shipment: { tenantOrgId: req.membership!.organizationId } },
    include: {
      shipment: {
        select: { id: true, referenceCode: true, status: true, carrier: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ invoices });
});

catalogRouter.patch(
  "/invoices/:id",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: param(req, "id"),
        shipment: { tenantOrgId: req.membership!.organizationId },
      },
    });
    if (!invoice) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
    const { status, invoiceAmount } = req.body as {
      status?: "DRAFT" | "SENT" | "PAID" | "DISPUTED";
      invoiceAmount?: number;
    };
    const amount = invoiceAmount != null ? invoiceAmount : Number(invoice.invoiceAmount);
    const estimate = Number(invoice.estimateAmount);
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        ...(status ? { status } : {}),
        ...(invoiceAmount != null ? { invoiceAmount } : {}),
        varianceFlag: Math.abs(amount - estimate) > estimate * 0.05,
      },
    });
    res.json({ invoice: updated });
  }
);
