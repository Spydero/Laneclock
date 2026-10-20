import {
  DEFAULT_DWELL_THRESHOLD_HOURS,
  DEFAULT_HOLD_THRESHOLD_HOURS,
  hoursBetween,
} from "@laneclock/shared";
import type { ExceptionSeverity, ExceptionType, Shipment } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

type RuleHit = {
  type: ExceptionType;
  severity: ExceptionSeverity;
  title: string;
  description: string;
};

export async function evaluateShipmentExceptions(shipmentId: string) {
  const shipment = await prisma.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
    include: {
      phases: true,
      documents: true,
      exceptions: { where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } },
    },
  });

  const hits = collectHits(shipment);
  const openTypes = new Set(shipment.exceptions.map((e) => e.type));

  for (const hit of hits) {
    if (openTypes.has(hit.type)) continue;
    await prisma.exception.create({
      data: {
        shipmentId,
        type: hit.type,
        severity: hit.severity,
        title: hit.title,
        description: hit.description,
      },
    });
  }

  return prisma.exception.findMany({
    where: { shipmentId },
    orderBy: { createdAt: "desc" },
  });
}

function collectHits(
  shipment: Shipment & {
    phases: {
      phase: string;
      actualStartAt: Date | null;
      actualEndAt: Date | null;
      plannedEndAt: Date | null;
    }[];
    documents: { type: string }[];
  }
): RuleHit[] {
  const hits: RuleHit[] = [];
  const now = new Date();

  if (
    shipment.promisedEta &&
    shipment.status !== "DELIVERED" &&
    shipment.status !== "CANCELLED" &&
    now > shipment.promisedEta
  ) {
    hits.push({
      type: "LATE_VS_ETA",
      severity: "CRITICAL",
      title: "Past promised ETA",
      description: `Shipment ${shipment.referenceCode} is past promised ETA without delivery.`,
    });
  }

  if (
    shipment.promisedEta &&
    shipment.status !== "DELIVERED" &&
    shipment.status !== "CANCELLED" &&
    now < shipment.promisedEta
  ) {
    const hoursLeft = hoursBetween(now, shipment.promisedEta);
    const progress =
      shipment.status === "IN_TRANSIT" || shipment.status === "AT_DELIVERY";
    if (progress && hoursLeft < 6 && (shipment.transitHours ?? 0) > 0) {
      hits.push({
        type: "AT_RISK",
        severity: "WARNING",
        title: "At risk of missing SLA",
        description: `${shipment.referenceCode} has ~${hoursLeft.toFixed(1)}h left and may miss ETA.`,
      });
    }
  }

  if ((shipment.pickupDwellHours ?? 0) > DEFAULT_DWELL_THRESHOLD_HOURS) {
    hits.push({
      type: "DWELL_OVER_THRESHOLD",
      severity: "WARNING",
      title: "Pickup dwell exceeded",
      description: `Pickup dwell ${shipment.pickupDwellHours?.toFixed(1)}h exceeds ${DEFAULT_DWELL_THRESHOLD_HOURS}h threshold.`,
    });
  }

  if ((shipment.deliveryDwellHours ?? 0) > DEFAULT_DWELL_THRESHOLD_HOURS) {
    hits.push({
      type: "DWELL_OVER_THRESHOLD",
      severity: "WARNING",
      title: "Delivery dwell exceeded",
      description: `Delivery dwell ${shipment.deliveryDwellHours?.toFixed(1)}h exceeds ${DEFAULT_DWELL_THRESHOLD_HOURS}h threshold.`,
    });
  }

  if (shipment.status === "ON_HOLD" && shipment.holdStartedAt) {
    const held = hoursBetween(shipment.holdStartedAt, now);
    if (held > DEFAULT_HOLD_THRESHOLD_HOURS) {
      hits.push({
        type: "ON_HOLD_TOO_LONG",
        severity: "CRITICAL",
        title: "On hold too long",
        description: `Held for ${held.toFixed(1)}h (threshold ${DEFAULT_HOLD_THRESHOLD_HOURS}h). Reason: ${shipment.holdReason ?? "n/a"}`,
      });
    }
  }

  if (shipment.status === "DELIVERED") {
    const hasPod = shipment.documents.some((d) => d.type === "POD");
    if (!hasPod) {
      hits.push({
        type: "MISSING_POD",
        severity: "WARNING",
        title: "Missing POD",
        description: `Delivered shipment ${shipment.referenceCode} has no proof of delivery document.`,
      });
    }
  }

  // Missed phase: planned end passed without actual start
  for (const phase of shipment.phases) {
    if (
      phase.actualStartAt == null &&
      phase.plannedEndAt &&
      phase.plannedEndAt < now &&
      shipment.status !== "CANCELLED" &&
      shipment.status !== "DELIVERED"
    ) {
      hits.push({
        type: "MISSED_PHASE",
        severity: "INFO",
        title: `Missed phase: ${phase.phase}`,
        description: `Planned end for ${phase.phase} has passed without an actual start.`,
      });
      break;
    }
  }

  return hits;
}

export async function evaluateAllOpenShipments() {
  const ids = await prisma.shipment.findMany({
    where: { status: { notIn: ["CANCELLED"] } },
    select: { id: true },
  });
  for (const { id } of ids) {
    await evaluateShipmentExceptions(id);
  }
}
