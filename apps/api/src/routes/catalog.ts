import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../lib/params.js";

export const catalogRouter = Router();

catalogRouter.get("/locations", requireAuth, async (_req, res) => {
  const locations = await prisma.location.findMany({ orderBy: { code: "asc" } });
  res.json({ locations });
});

catalogRouter.get("/lanes", requireAuth, async (_req, res) => {
  const lanes = await prisma.lane.findMany({
    include: {
      originLocation: true,
      destinationLocation: true,
    },
    orderBy: { name: "asc" },
  });
  res.json({ lanes });
});

catalogRouter.get("/carriers", requireAuth, async (_req, res) => {
  const carriers = await prisma.carrier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  res.json({ carriers });
});

catalogRouter.get("/customers", requireAuth, requireRoles("ADMIN", "OPS"), async (req: AuthedRequest, res) => {
  // Customer orgs that have CLIENT memberships (or seeded customers)
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
