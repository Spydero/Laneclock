import type { FreightMode, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type AnalyticsQuery = {
  from?: Date;
  to?: Date;
  carrierId?: string;
  laneId?: string;
  mode?: FreightMode;
  customerOrgId?: string;
  tenantOrgId?: string;
  /** Client scope: only their customer org */
  scopeCustomerOrgId?: string;
};

function shipmentWhere(q: AnalyticsQuery): Prisma.ShipmentWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (q.from) createdAt.gte = q.from;
  if (q.to) createdAt.lte = q.to;

  return {
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(q.carrierId ? { carrierId: q.carrierId } : {}),
    ...(q.laneId ? { laneId: q.laneId } : {}),
    ...(q.mode ? { mode: q.mode } : {}),
    ...(q.customerOrgId ? { customerOrgId: q.customerOrgId } : {}),
    ...(q.tenantOrgId ? { tenantOrgId: q.tenantOrgId } : {}),
    ...(q.scopeCustomerOrgId ? { customerOrgId: q.scopeCustomerOrgId } : {}),
    status: { not: "CANCELLED" },
  };
}

export async function getCommandDashboard(q: AnalyticsQuery) {
  const where = shipmentWhere(q);
  const [active, delayed, exceptionsOpen, delivered, cycleAgg] = await Promise.all([
    prisma.shipment.count({
      where: { ...where, status: { notIn: ["DELIVERED", "CANCELLED"] } },
    }),
    prisma.shipment.count({ where: { ...where, slaOutcome: "LATE" } }),
    prisma.exception.count({
      where: {
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
        shipment: where,
      },
    }),
    prisma.shipment.count({ where: { ...where, status: "DELIVERED" } }),
    prisma.shipment.aggregate({
      where: { ...where, cycleTimeHours: { not: null } },
      _avg: { cycleTimeHours: true },
    }),
  ]);

  const otifCount = await prisma.shipment.count({
    where: { ...where, status: "DELIVERED", otif: true },
  });

  return {
    active,
    delayed,
    exceptionsOpen,
    delivered,
    avgCycleTimeHours: cycleAgg._avg.cycleTimeHours ?? 0,
    otifPercent: delivered ? (otifCount / delivered) * 100 : 0,
  };
}

export async function getOtifTrend(q: AnalyticsQuery) {
  const shipments = await prisma.shipment.findMany({
    where: { ...shipmentWhere(q), status: "DELIVERED", actualDeliveryAt: { not: null } },
    select: { actualDeliveryAt: true, otif: true },
    orderBy: { actualDeliveryAt: "asc" },
  });

  const buckets = new Map<string, { total: number; otif: number }>();
  for (const s of shipments) {
    const key = s.actualDeliveryAt!.toISOString().slice(0, 10);
    const b = buckets.get(key) ?? { total: 0, otif: 0 };
    b.total += 1;
    if (s.otif) b.otif += 1;
    buckets.set(key, b);
  }

  return [...buckets.entries()].map(([date, b]) => ({
    date,
    otifPercent: b.total ? (b.otif / b.total) * 100 : 0,
    volume: b.total,
  }));
}

export async function getCycleTimeDistribution(q: AnalyticsQuery) {
  const rows = await prisma.shipment.findMany({
    where: { ...shipmentWhere(q), cycleTimeHours: { not: null } },
    select: { cycleTimeHours: true },
  });
  const bins = [
    { label: "0-12h", min: 0, max: 12 },
    { label: "12-24h", min: 12, max: 24 },
    { label: "24-48h", min: 24, max: 48 },
    { label: "48-72h", min: 48, max: 72 },
    { label: "72h+", min: 72, max: Infinity },
  ];
  return bins.map((bin) => ({
    label: bin.label,
    count: rows.filter(
      (r) => (r.cycleTimeHours ?? 0) >= bin.min && (r.cycleTimeHours ?? 0) < bin.max
    ).length,
  }));
}

export async function getDwellHeatmap(q: AnalyticsQuery) {
  const rows = await prisma.shipment.findMany({
    where: shipmentWhere(q),
    select: {
      pickupDwellHours: true,
      deliveryDwellHours: true,
      originLocation: { select: { name: true, code: true } },
      destinationLocation: { select: { name: true, code: true } },
      createdAt: true,
    },
  });

  const byFacility = new Map<string, { total: number; sum: number }>();
  const byDow = new Map<number, { total: number; sum: number }>();

  for (const r of rows) {
    const originKey = r.originLocation.code;
    const dwell = (r.pickupDwellHours ?? 0) + (r.deliveryDwellHours ?? 0);
    const o = byFacility.get(originKey) ?? { total: 0, sum: 0 };
    o.total += 1;
    o.sum += dwell;
    byFacility.set(originKey, o);

    const dow = r.createdAt.getDay();
    const d = byDow.get(dow) ?? { total: 0, sum: 0 };
    d.total += 1;
    d.sum += dwell;
    byDow.set(dow, d);
  }

  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    byFacility: [...byFacility.entries()].map(([code, v]) => ({
      facility: code,
      avgDwellHours: v.total ? v.sum / v.total : 0,
      shipments: v.total,
    })),
    byDayOfWeek: dowNames.map((name, i) => {
      const v = byDow.get(i) ?? { total: 0, sum: 0 };
      return { day: name, avgDwellHours: v.total ? v.sum / v.total : 0, shipments: v.total };
    }),
  };
}

export async function getLanePerformance(q: AnalyticsQuery) {
  const rows = await prisma.shipment.findMany({
    where: { ...shipmentWhere(q), laneId: { not: null } },
    select: {
      transitHours: true,
      otif: true,
      status: true,
      lane: { select: { id: true, name: true, expectedTransitHours: true } },
    },
  });

  const map = new Map<
    string,
    { name: string; expected: number; actualSum: number; n: number; otif: number; delivered: number }
  >();
  for (const r of rows) {
    if (!r.lane) continue;
    const m =
      map.get(r.lane.id) ??
      {
        name: r.lane.name,
        expected: r.lane.expectedTransitHours,
        actualSum: 0,
        n: 0,
        otif: 0,
        delivered: 0,
      };
    if (r.transitHours != null) {
      m.actualSum += r.transitHours;
      m.n += 1;
    }
    if (r.status === "DELIVERED") {
      m.delivered += 1;
      if (r.otif) m.otif += 1;
    }
    map.set(r.lane.id, m);
  }

  return [...map.entries()].map(([id, m]) => ({
    laneId: id,
    lane: m.name,
    expectedHours: m.expected,
    actualHours: m.n ? m.actualSum / m.n : null,
    otifPercent: m.delivered ? (m.otif / m.delivered) * 100 : null,
    volume: m.delivered || m.n,
  }));
}

export async function getCarrierScorecard(q: AnalyticsQuery) {
  const rows = await prisma.shipment.findMany({
    where: { ...shipmentWhere(q), carrierId: { not: null } },
    select: {
      carrierId: true,
      carrier: { select: { name: true, code: true } },
      otif: true,
      status: true,
      slaOutcome: true,
      cycleTimeHours: true,
      promisedEta: true,
      actualDeliveryAt: true,
      exceptions: { select: { id: true } },
    },
  });

  const map = new Map<
    string,
    {
      name: string;
      code: string;
      volume: number;
      delivered: number;
      otif: number;
      delaySum: number;
      delayN: number;
      exceptions: number;
    }
  >();

  for (const r of rows) {
    if (!r.carrierId || !r.carrier) continue;
    const m =
      map.get(r.carrierId) ??
      {
        name: r.carrier.name,
        code: r.carrier.code,
        volume: 0,
        delivered: 0,
        otif: 0,
        delaySum: 0,
        delayN: 0,
        exceptions: 0,
      };
    m.volume += 1;
    m.exceptions += r.exceptions.length;
    if (r.status === "DELIVERED") {
      m.delivered += 1;
      if (r.otif) m.otif += 1;
      if (r.promisedEta && r.actualDeliveryAt && r.slaOutcome === "LATE") {
        m.delaySum +=
          (r.actualDeliveryAt.getTime() - r.promisedEta.getTime()) / 3600_000;
        m.delayN += 1;
      }
    }
    map.set(r.carrierId, m);
  }

  return [...map.entries()].map(([id, m]) => ({
    carrierId: id,
    name: m.name,
    code: m.code,
    volume: m.volume,
    otifPercent: m.delivered ? (m.otif / m.delivered) * 100 : 0,
    avgDelayHours: m.delayN ? m.delaySum / m.delayN : 0,
    exceptionRate: m.volume ? (m.exceptions / m.volume) * 100 : 0,
  }));
}

export async function getModeMix(q: AnalyticsQuery) {
  const rows = await prisma.shipment.groupBy({
    by: ["mode"],
    where: shipmentWhere(q),
    _count: { _all: true },
  });
  const late = await prisma.shipment.groupBy({
    by: ["mode"],
    where: { ...shipmentWhere(q), slaOutcome: "LATE" },
    _count: { _all: true },
  });
  const lateMap = new Map(late.map((l) => [l.mode, l._count._all]));
  return rows.map((r) => ({
    mode: r.mode,
    volume: r._count._all,
    delayed: lateMap.get(r.mode) ?? 0,
  }));
}

export async function getDelayPareto(q: AnalyticsQuery) {
  const rows = await prisma.shipment.groupBy({
    by: ["delayReason"],
    where: { ...shipmentWhere(q), delayReason: { not: null } },
    _count: { _all: true },
  });
  const sorted = rows
    .filter((r) => r.delayReason)
    .map((r) => ({ reason: r.delayReason!, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, r) => s + r.count, 0);
  let cum = 0;
  return sorted.map((r) => {
    cum += r.count;
    return {
      reason: r.reason,
      count: r.count,
      percent: total ? (r.count / total) * 100 : 0,
      cumulativePercent: total ? (cum / total) * 100 : 0,
    };
  });
}

export async function getVolumeVsOntime(q: AnalyticsQuery) {
  const trend = await getOtifTrend(q);
  return trend.map((t) => ({
    date: t.date,
    volume: t.volume,
    onTimePercent: t.otifPercent,
  }));
}
