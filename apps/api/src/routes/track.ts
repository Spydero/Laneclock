import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashToken } from "../lib/tokens.js";
import { param } from "../lib/params.js";

export const trackRouter = Router();

trackRouter.get("/:token", async (req, res) => {
  const hash = hashToken(param(req, "token"));
  const shipment = await prisma.shipment.findFirst({
    where: { trackingTokenHash: hash },
    select: {
      id: true,
      referenceCode: true,
      status: true,
      mode: true,
      promisedEtd: true,
      promisedEta: true,
      actualDeliveryAt: true,
      slaOutcome: true,
      otif: true,
      pickupDwellHours: true,
      transitHours: true,
      deliveryDwellHours: true,
      cycleTimeHours: true,
      commodity: true,
      originLocation: { select: { name: true, city: true, country: true, code: true } },
      destinationLocation: { select: { name: true, city: true, country: true, code: true } },
      carrier: { select: { name: true, code: true } },
      phases: {
        orderBy: { phase: "asc" },
        select: {
          phase: true,
          plannedStartAt: true,
          plannedEndAt: true,
          actualStartAt: true,
          actualEndAt: true,
          locationLabel: true,
          notes: true,
        },
      },
    },
  });
  if (!shipment) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
  res.json({ shipment });
});
