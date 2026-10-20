import {
  PHASE_ORDER,
  computeSlaOutcome,
  hoursBetween,
  isOtif,
  type ShipmentPhaseType,
} from "@laneclock/shared";
import type { Prisma, Shipment, ShipmentPhase } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type PhaseMetrics = {
  pickupDwellHours: number | null;
  transitHours: number | null;
  deliveryDwellHours: number | null;
  cycleTimeHours: number | null;
  slaOutcome: "EARLY" | "ON_TIME" | "LATE" | "PENDING";
  otif: boolean;
  actualDeliveryAt: Date | null;
};

function phaseMap(phases: ShipmentPhase[]): Map<ShipmentPhaseType, ShipmentPhase> {
  return new Map(phases.map((p) => [p.phase as ShipmentPhaseType, p]));
}

export function computeMetrics(
  shipment: Pick<Shipment, "promisedEta" | "slaGraceHours" | "inFull">,
  phases: ShipmentPhase[]
): PhaseMetrics {
  const map = phaseMap(phases);
  const atPickup = map.get("AT_PICKUP");
  const inTransit = map.get("IN_TRANSIT");
  const atDelivery = map.get("AT_DELIVERY");
  const delivered = map.get("DELIVERED");
  const booked = map.get("BOOKED");

  let pickupDwellHours: number | null = null;
  if (atPickup?.actualStartAt && (atPickup.actualEndAt || inTransit?.actualStartAt)) {
    const end = atPickup.actualEndAt ?? inTransit!.actualStartAt!;
    pickupDwellHours = hoursBetween(atPickup.actualStartAt, end);
  }

  let transitHours: number | null = null;
  if (inTransit?.actualStartAt && (inTransit.actualEndAt || atDelivery?.actualStartAt)) {
    const end = inTransit.actualEndAt ?? atDelivery!.actualStartAt!;
    transitHours = hoursBetween(inTransit.actualStartAt, end);
  }

  let deliveryDwellHours: number | null = null;
  if (atDelivery?.actualStartAt && (atDelivery.actualEndAt || delivered?.actualStartAt)) {
    const end = atDelivery.actualEndAt ?? delivered!.actualStartAt!;
    deliveryDwellHours = hoursBetween(atDelivery.actualStartAt, end);
  }

  const start =
    booked?.actualStartAt ??
    map.get("DISPATCHED")?.actualStartAt ??
    atPickup?.actualStartAt ??
    null;
  const actualDeliveryAt = delivered?.actualStartAt ?? delivered?.actualEndAt ?? null;

  let cycleTimeHours: number | null = null;
  if (start && actualDeliveryAt) {
    cycleTimeHours = hoursBetween(start, actualDeliveryAt);
  }

  const slaOutcome = computeSlaOutcome(
    shipment.promisedEta,
    actualDeliveryAt,
    shipment.slaGraceHours
  );
  const otif = isOtif(slaOutcome, shipment.inFull);

  return {
    pickupDwellHours,
    transitHours,
    deliveryDwellHours,
    cycleTimeHours,
    slaOutcome,
    otif,
    actualDeliveryAt,
  };
}

export async function recomputeShipmentMetrics(shipmentId: string) {
  const shipment = await prisma.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
    include: { phases: true },
  });
  const metrics = computeMetrics(shipment, shipment.phases);
  return prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      pickupDwellHours: metrics.pickupDwellHours,
      transitHours: metrics.transitHours,
      deliveryDwellHours: metrics.deliveryDwellHours,
      cycleTimeHours: metrics.cycleTimeHours,
      slaOutcome: metrics.slaOutcome,
      otif: metrics.otif,
      actualDeliveryAt: metrics.actualDeliveryAt,
    },
    include: {
      phases: { orderBy: { createdAt: "asc" } },
      originLocation: true,
      destinationLocation: true,
      carrier: true,
      lane: true,
      customerOrg: true,
      exceptions: { where: { status: { not: "RESOLVED" } } },
    },
  });
}

export async function ensureDefaultPhases(
  shipmentId: string,
  promisedEtd: Date | null,
  promisedEta: Date | null,
  tx: Prisma.TransactionClient = prisma
) {
  const now = new Date();
  const spanMs =
    promisedEtd && promisedEta
      ? Math.max(promisedEta.getTime() - promisedEtd.getTime(), 6 * 3600_000)
      : 48 * 3600_000;
  const start = promisedEtd ?? now;

  const planned: { phase: ShipmentPhaseType; startOffset: number; endOffset: number }[] = [
    { phase: "BOOKED", startOffset: 0, endOffset: 0.05 },
    { phase: "DISPATCHED", startOffset: 0.05, endOffset: 0.1 },
    { phase: "AT_PICKUP", startOffset: 0.1, endOffset: 0.2 },
    { phase: "IN_TRANSIT", startOffset: 0.2, endOffset: 0.85 },
    { phase: "AT_DELIVERY", startOffset: 0.85, endOffset: 0.95 },
    { phase: "DELIVERED", startOffset: 0.95, endOffset: 1 },
  ];

  for (const p of planned) {
    await tx.shipmentPhase.create({
      data: {
        shipmentId,
        phase: p.phase,
        plannedStartAt: new Date(start.getTime() + spanMs * p.startOffset),
        plannedEndAt: new Date(start.getTime() + spanMs * p.endOffset),
        actualStartAt: p.phase === "BOOKED" ? now : null,
      },
    });
  }
}

export function statusForPhase(phase: ShipmentPhaseType): Prisma.ShipmentUpdateInput["status"] {
  return phase;
}

export { PHASE_ORDER };
