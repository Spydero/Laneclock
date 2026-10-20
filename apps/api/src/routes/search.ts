import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const searchRouter = Router();

searchRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q || q.length < 2) {
    return res.json({ shipments: [], carriers: [], lanes: [], customers: [] });
  }

  const isClient = req.membership?.role === "CLIENT";
  const shipmentWhere = isClient
    ? { customerOrgId: req.membership!.organizationId }
    : { tenantOrgId: req.membership!.organizationId };

  const [shipments, carriers, lanes, customers] = await Promise.all([
    prisma.shipment.findMany({
      where: {
        ...shipmentWhere,
        OR: [
          { referenceCode: { contains: q, mode: "insensitive" } },
          { commodity: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, referenceCode: true, status: true },
    }),
    prisma.carrier.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { code: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
    }),
    prisma.lane.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      take: 8,
      include: { originLocation: true, destinationLocation: true },
    }),
    isClient
      ? Promise.resolve([])
      : prisma.organization.findMany({
          where: {
            name: { contains: q, mode: "insensitive" },
            members: { some: { role: "CLIENT" } },
          },
          take: 8,
        }),
  ]);

  res.json({ shipments, carriers, lanes, customers });
});
