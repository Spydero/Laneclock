import { describe, expect, it } from "vitest";
import { computeSlaOutcome, hoursBetween, isOtif } from "@laneclock/shared";
import { computeMetrics } from "./services/clock.js";

describe("hoursBetween", () => {
  it("computes positive hours", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-01-01T12:00:00Z");
    expect(hoursBetween(a, b)).toBe(12);
  });
});

describe("computeSlaOutcome", () => {
  it("marks on-time within grace", () => {
    const promised = new Date("2026-01-02T12:00:00Z");
    const actual = new Date("2026-01-02T14:00:00Z");
    expect(computeSlaOutcome(promised, actual, 4)).toBe("ON_TIME");
  });

  it("marks late beyond grace", () => {
    const promised = new Date("2026-01-02T12:00:00Z");
    const actual = new Date("2026-01-02T18:00:00Z");
    expect(computeSlaOutcome(promised, actual, 4)).toBe("LATE");
  });

  it("marks early", () => {
    const promised = new Date("2026-01-02T12:00:00Z");
    const actual = new Date("2026-01-02T06:00:00Z");
    expect(computeSlaOutcome(promised, actual, 4)).toBe("EARLY");
  });
});

describe("isOtif", () => {
  it("requires on-time and in-full", () => {
    expect(isOtif("ON_TIME", true)).toBe(true);
    expect(isOtif("ON_TIME", false)).toBe(false);
    expect(isOtif("LATE", true)).toBe(false);
  });
});

describe("computeMetrics", () => {
  it("computes dwell and transit from phases", () => {
    const metrics = computeMetrics(
      {
        promisedEta: new Date("2026-01-03T12:00:00Z"),
        slaGraceHours: 4,
        inFull: true,
      },
      [
        {
          id: "1",
          shipmentId: "s",
          phase: "BOOKED",
          plannedStartAt: null,
          plannedEndAt: null,
          actualStartAt: new Date("2026-01-01T00:00:00Z"),
          actualEndAt: null,
          locationLabel: null,
          notes: null,
          delayReason: null,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          shipmentId: "s",
          phase: "AT_PICKUP",
          plannedStartAt: null,
          plannedEndAt: null,
          actualStartAt: new Date("2026-01-01T02:00:00Z"),
          actualEndAt: new Date("2026-01-01T06:00:00Z"),
          locationLabel: null,
          notes: null,
          delayReason: null,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          shipmentId: "s",
          phase: "IN_TRANSIT",
          plannedStartAt: null,
          plannedEndAt: null,
          actualStartAt: new Date("2026-01-01T06:00:00Z"),
          actualEndAt: new Date("2026-01-02T06:00:00Z"),
          locationLabel: null,
          notes: null,
          delayReason: null,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "4",
          shipmentId: "s",
          phase: "AT_DELIVERY",
          plannedStartAt: null,
          plannedEndAt: null,
          actualStartAt: new Date("2026-01-02T06:00:00Z"),
          actualEndAt: new Date("2026-01-02T08:00:00Z"),
          locationLabel: null,
          notes: null,
          delayReason: null,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "5",
          shipmentId: "s",
          phase: "DELIVERED",
          plannedStartAt: null,
          plannedEndAt: null,
          actualStartAt: new Date("2026-01-02T08:00:00Z"),
          actualEndAt: null,
          locationLabel: null,
          notes: null,
          delayReason: null,
          createdById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
    );
    expect(metrics.pickupDwellHours).toBe(4);
    expect(metrics.transitHours).toBe(24);
    expect(metrics.deliveryDwellHours).toBe(2);
    expect(metrics.cycleTimeHours).toBe(32);
    expect(metrics.slaOutcome).toBe("EARLY");
    expect(metrics.otif).toBe(true);
  });
});
