import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireApprovedClient, type AuthedRequest } from "../middleware/auth.js";

export const exportRouter = Router();

exportRouter.get(
  "/shipments.csv",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    if (!req.membership) {
      return res.status(403).json({ error: "No organization membership", code: "FORBIDDEN" });
    }
    const where =
      req.membership.role === "CLIENT"
        ? { customerOrgId: req.membership.organizationId }
        : { tenantOrgId: req.membership.organizationId };

    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        carrier: true,
        lane: true,
        originLocation: true,
        destinationLocation: true,
        customerOrg: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const header = [
      "referenceCode",
      "status",
      "mode",
      "customer",
      "carrier",
      "lane",
      "origin",
      "destination",
      "promisedEta",
      "actualDeliveryAt",
      "slaOutcome",
      "otif",
      "pickupDwellHours",
      "transitHours",
      "deliveryDwellHours",
      "cycleTimeHours",
      "delayReason",
    ];
    const lines = [header.join(",")];
    for (const s of shipments) {
      lines.push(
        [
          s.referenceCode,
          s.status,
          s.mode,
          csv(s.customerOrg?.name ?? ""),
          csv(s.carrier?.name ?? ""),
          csv(s.lane?.name ?? ""),
          csv(s.originLocation?.code ?? ""),
          csv(s.destinationLocation?.code ?? ""),
          s.promisedEta?.toISOString() ?? "",
          s.actualDeliveryAt?.toISOString() ?? "",
          s.slaOutcome,
          String(s.otif),
          s.pickupDwellHours ?? "",
          s.transitHours ?? "",
          s.deliveryDwellHours ?? "",
          s.cycleTimeHours ?? "",
          s.delayReason ?? "",
        ].join(",")
      );
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=laneclock-shipments.csv");
    res.send(lines.join("\n"));
  }
);

function csv(value: string) {
  if (value.includes(",") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
