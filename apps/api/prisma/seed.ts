import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), "../../.env") });
config();

import { PrismaClient, type FreightMode, type DelayReason } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { createHash, randomBytes } from "node:crypto";
import { computeMetrics, ensureDefaultPhases } from "../src/services/clock.js";
import { evaluateShipmentExceptions } from "../src/services/exceptions.js";

const prisma = new PrismaClient();

function tracking() {
  const raw = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash, hint: raw.slice(0, 6) };
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000);
}

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600_000);
}

async function main() {
  console.log("Seeding Laneclock…");

  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.exception.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.document.deleteMany();
  await prisma.shipmentComment.deleteMany();
  await prisma.shipmentPhase.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.lane.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.location.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const password = await hashPassword("demo1234");

  const tenant = await prisma.organization.create({
    data: {
      name: "Laneclock Ops",
      slug: "laneclock-ops",
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const acme = await prisma.organization.create({
    data: {
      name: "Acme Trading Co.",
      slug: "acme-trading",
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    },
  });

  const globex = await prisma.organization.create({
    data: {
      name: "Globex Manufacturing",
      slug: "globex",
      approvalStatus: "PENDING",
    },
  });

  async function createDemoUser(email: string, name: string) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: true,
      },
    });
    // Better Auth looks up credential accounts where accountId === user.id
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password,
      },
    });
    return user;
  }

  const admin = await createDemoUser("admin@laneclock.demo", "Alex Admin");
  const ops = await createDemoUser("ops@laneclock.demo", "Olivia Ops");
  const client = await createDemoUser("client@laneclock.demo", "Casey Client");

  await prisma.membership.createMany({
    data: [
      { userId: admin.id, organizationId: tenant.id, role: "ADMIN" },
      { userId: ops.id, organizationId: tenant.id, role: "OPS" },
      { userId: client.id, organizationId: acme.id, role: "CLIENT" },
    ],
  });

  const locations = await Promise.all(
    [
      { code: "LAX-WH", name: "LAX Crossdock", city: "Los Angeles", country: "US", type: "WAREHOUSE" as const },
      { code: "CHI-HUB", name: "Chicago Hub", city: "Chicago", country: "US", type: "HUB" as const },
      { code: "DAL-DC", name: "Dallas DC", city: "Dallas", country: "US", type: "WAREHOUSE" as const },
      { code: "JFK-AP", name: "JFK Air Cargo", city: "New York", country: "US", type: "AIRPORT" as const },
      { code: "SGSIN", name: "Port of Singapore", city: "Singapore", country: "SG", type: "PORT" as const },
      { code: "NLRTM", name: "Port of Rotterdam", city: "Rotterdam", country: "NL", type: "PORT" as const },
      { code: "ATL-WH", name: "Atlanta Warehouse", city: "Atlanta", country: "US", type: "WAREHOUSE" as const },
      { code: "SEA-HUB", name: "Seattle Hub", city: "Seattle", country: "US", type: "HUB" as const },
    ].map((l) => prisma.location.create({ data: l }))
  );

  const byCode = Object.fromEntries(locations.map((l) => [l.code, l]));

  const carriers = await Promise.all([
    prisma.carrier.create({
      data: {
        name: "Northstar Haulage",
        code: "NSTAR",
        modes: ["FTL", "LTL"],
        contactEmail: "dispatch@northstar.demo",
      },
    }),
    prisma.carrier.create({
      data: {
        name: "Pacific Box Line",
        code: "PBOX",
        modes: ["OCEAN"],
        contactEmail: "ops@pbox.demo",
      },
    }),
    prisma.carrier.create({
      data: {
        name: "Skybridge Air",
        code: "SKYB",
        modes: ["AIR"],
        contactEmail: "cargo@skybridge.demo",
      },
    }),
    prisma.carrier.create({
      data: {
        name: "Midwest Relay",
        code: "MREL",
        modes: ["FTL", "RAIL"],
        contactEmail: "relay@midwest.demo",
      },
    }),
  ]);

  const lanes = await Promise.all([
    prisma.lane.create({
      data: {
        name: "LAX → CHI",
        originLocationId: byCode["LAX-WH"].id,
        destinationLocationId: byCode["CHI-HUB"].id,
        expectedTransitHours: 42,
        mode: "FTL",
      },
    }),
    prisma.lane.create({
      data: {
        name: "CHI → DAL",
        originLocationId: byCode["CHI-HUB"].id,
        destinationLocationId: byCode["DAL-DC"].id,
        expectedTransitHours: 18,
        mode: "FTL",
      },
    }),
    prisma.lane.create({
      data: {
        name: "SIN → RTM",
        originLocationId: byCode["SGSIN"].id,
        destinationLocationId: byCode["NLRTM"].id,
        expectedTransitHours: 480,
        mode: "OCEAN",
      },
    }),
    prisma.lane.create({
      data: {
        name: "LAX → JFK Air",
        originLocationId: byCode["LAX-WH"].id,
        destinationLocationId: byCode["JFK-AP"].id,
        expectedTransitHours: 8,
        mode: "AIR",
      },
    }),
    prisma.lane.create({
      data: {
        name: "SEA → ATL",
        originLocationId: byCode["SEA-HUB"].id,
        destinationLocationId: byCode["ATL-WH"].id,
        expectedTransitHours: 55,
        mode: "FTL",
      },
    }),
  ]);

  for (const lane of lanes) {
    await prisma.rateCard.create({
      data: {
        organizationId: tenant.id,
        laneId: lane.id,
        carrierId: carriers[0].id,
        mode: lane.mode,
        baseRate: lane.mode === "OCEAN" ? 4200 : lane.mode === "AIR" ? 1800 : 1450,
      },
    });
  }

  type SeedShip = {
    ref: string;
    customerId: string;
    carrierId: string;
    laneId: string;
    mode: FreightMode;
    origin: string;
    dest: string;
    status: "BOOKED" | "DISPATCHED" | "AT_PICKUP" | "IN_TRANSIT" | "AT_DELIVERY" | "DELIVERED" | "ON_HOLD";
    promisedEtaOffsetH: number;
    delayReason?: DelayReason;
    inFull?: boolean;
    hold?: string;
    scenario: "on_time" | "early" | "late" | "in_progress" | "at_risk" | "held";
  };

  const specs: SeedShip[] = [
    {
      ref: "LC-2026-00001",
      customerId: acme.id,
      carrierId: carriers[0].id,
      laneId: lanes[0].id,
      mode: "FTL",
      origin: "LAX-WH",
      dest: "CHI-HUB",
      status: "DELIVERED",
      promisedEtaOffsetH: -20,
      scenario: "on_time",
    },
    {
      ref: "LC-2026-00002",
      customerId: acme.id,
      carrierId: carriers[0].id,
      laneId: lanes[1].id,
      mode: "FTL",
      origin: "CHI-HUB",
      dest: "DAL-DC",
      status: "DELIVERED",
      promisedEtaOffsetH: -10,
      scenario: "early",
    },
    {
      ref: "LC-2026-00003",
      customerId: acme.id,
      carrierId: carriers[3].id,
      laneId: lanes[4].id,
      mode: "FTL",
      origin: "SEA-HUB",
      dest: "ATL-WH",
      status: "DELIVERED",
      promisedEtaOffsetH: -5,
      delayReason: "TRAFFIC",
      scenario: "late",
    },
    {
      ref: "LC-2026-00004",
      customerId: acme.id,
      carrierId: carriers[1].id,
      laneId: lanes[2].id,
      mode: "OCEAN",
      origin: "SGSIN",
      dest: "NLRTM",
      status: "IN_TRANSIT",
      promisedEtaOffsetH: 120,
      scenario: "in_progress",
    },
    {
      ref: "LC-2026-00005",
      customerId: acme.id,
      carrierId: carriers[2].id,
      laneId: lanes[3].id,
      mode: "AIR",
      origin: "LAX-WH",
      dest: "JFK-AP",
      status: "IN_TRANSIT",
      promisedEtaOffsetH: 3,
      scenario: "at_risk",
    },
    {
      ref: "LC-2026-00006",
      customerId: acme.id,
      carrierId: carriers[0].id,
      laneId: lanes[0].id,
      mode: "FTL",
      origin: "LAX-WH",
      dest: "CHI-HUB",
      status: "ON_HOLD",
      promisedEtaOffsetH: 30,
      hold: "Awaiting customs paperwork",
      delayReason: "DOCS",
      scenario: "held",
    },
    {
      ref: "LC-2026-00007",
      customerId: acme.id,
      carrierId: carriers[3].id,
      laneId: lanes[1].id,
      mode: "LTL",
      origin: "CHI-HUB",
      dest: "DAL-DC",
      status: "AT_PICKUP",
      promisedEtaOffsetH: 40,
      scenario: "in_progress",
    },
    {
      ref: "LC-2026-00008",
      customerId: acme.id,
      carrierId: carriers[0].id,
      laneId: lanes[4].id,
      mode: "FTL",
      origin: "SEA-HUB",
      dest: "ATL-WH",
      status: "DELIVERED",
      promisedEtaOffsetH: -48,
      delayReason: "DOCK_CONGESTION",
      scenario: "late",
    },
    {
      ref: "LC-2026-00009",
      customerId: acme.id,
      carrierId: carriers[2].id,
      laneId: lanes[3].id,
      mode: "AIR",
      origin: "LAX-WH",
      dest: "JFK-AP",
      status: "DELIVERED",
      promisedEtaOffsetH: -72,
      scenario: "on_time",
    },
    {
      ref: "LC-2026-00010",
      customerId: acme.id,
      carrierId: carriers[1].id,
      laneId: lanes[2].id,
      mode: "OCEAN",
      origin: "SGSIN",
      dest: "NLRTM",
      status: "BOOKED",
      promisedEtaOffsetH: 500,
      scenario: "in_progress",
    },
  ];

  const trackingTokens: Record<string, string> = {};

  for (const spec of specs) {
    const tok = tracking();
    trackingTokens[spec.ref] = tok.raw;
    const promisedEta = hoursFromNow(spec.promisedEtaOffsetH);
    const promisedEtd = hoursAgo(Math.abs(spec.promisedEtaOffsetH) + 48);

    const shipment = await prisma.shipment.create({
      data: {
        tenantOrgId: tenant.id,
        customerOrgId: spec.customerId,
        carrierId: spec.carrierId,
        laneId: spec.laneId,
        referenceCode: spec.ref,
        mode: spec.mode,
        status: spec.status,
        originLocationId: byCode[spec.origin].id,
        destinationLocationId: byCode[spec.dest].id,
        promisedEtd,
        promisedEta,
        weightKg: 1200 + Math.random() * 8000,
        packageCount: 10 + Math.floor(Math.random() * 40),
        commodity: "General merchandise",
        hazmat: false,
        assigneeId: ops.id,
        trackingTokenHash: tok.hash,
        trackingTokenHint: tok.hint,
        delayReason: spec.delayReason,
        holdReason: spec.hold,
        holdStartedAt: spec.scenario === "held" ? hoursAgo(30) : undefined,
        inFull: spec.inFull ?? true,
      },
    });

    await ensureDefaultPhases(shipment.id, promisedEtd, promisedEta);

    // Apply scenario timestamps
    const phases = await prisma.shipmentPhase.findMany({ where: { shipmentId: shipment.id } });
    const setPhase = async (
      name: string,
      start: Date | null,
      end: Date | null = null
    ) => {
      const p = phases.find((x) => x.phase === name);
      if (!p) return;
      await prisma.shipmentPhase.update({
        where: { id: p.id },
        data: { actualStartAt: start, actualEndAt: end, createdById: ops.id },
      });
    };

    if (spec.scenario === "on_time") {
      await setPhase("BOOKED", hoursAgo(60));
      await setPhase("DISPATCHED", hoursAgo(58), hoursAgo(56));
      await setPhase("AT_PICKUP", hoursAgo(56), hoursAgo(52));
      await setPhase("IN_TRANSIT", hoursAgo(52), hoursAgo(24));
      await setPhase("AT_DELIVERY", hoursAgo(24), hoursAgo(22));
      await setPhase("DELIVERED", hoursAgo(22));
    } else if (spec.scenario === "early") {
      await setPhase("BOOKED", hoursAgo(40));
      await setPhase("DISPATCHED", hoursAgo(38), hoursAgo(36));
      await setPhase("AT_PICKUP", hoursAgo(36), hoursAgo(34));
      await setPhase("IN_TRANSIT", hoursAgo(34), hoursAgo(18));
      await setPhase("AT_DELIVERY", hoursAgo(18), hoursAgo(16));
      await setPhase("DELIVERED", hoursAgo(16));
    } else if (spec.scenario === "late") {
      await setPhase("BOOKED", hoursAgo(80));
      await setPhase("DISPATCHED", hoursAgo(78), hoursAgo(70));
      await setPhase("AT_PICKUP", hoursAgo(70), hoursAgo(58)); // long dwell
      await setPhase("IN_TRANSIT", hoursAgo(58), hoursAgo(10));
      await setPhase("AT_DELIVERY", hoursAgo(10), hoursAgo(2));
      await setPhase("DELIVERED", hoursAgo(2));
    } else if (spec.scenario === "in_progress" || spec.scenario === "at_risk") {
      await setPhase("BOOKED", hoursAgo(30));
      await setPhase("DISPATCHED", hoursAgo(28), hoursAgo(26));
      await setPhase("AT_PICKUP", hoursAgo(26), hoursAgo(20));
      await setPhase("IN_TRANSIT", hoursAgo(20), null);
    } else if (spec.scenario === "held") {
      await setPhase("BOOKED", hoursAgo(40));
      await setPhase("DISPATCHED", hoursAgo(38), hoursAgo(36));
      await setPhase("AT_PICKUP", hoursAgo(36), null);
    }

    const refreshed = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      include: { phases: true },
    });
    const metrics = computeMetrics(refreshed, refreshed.phases);
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        pickupDwellHours: metrics.pickupDwellHours,
        transitHours: metrics.transitHours,
        deliveryDwellHours: metrics.deliveryDwellHours,
        cycleTimeHours: metrics.cycleTimeHours,
        slaOutcome: metrics.slaOutcome,
        otif: metrics.otif,
        actualDeliveryAt: metrics.actualDeliveryAt,
      },
    });

    await prisma.document.create({
      data: {
        shipmentId: shipment.id,
        name: `${spec.ref}-BOL.pdf`,
        type: "BOL",
        mimeType: "application/pdf",
        storageKey: `seeded/${spec.ref}/bol.pdf`,
        sizeBytes: 24_000,
      },
    });

    if (spec.status === "DELIVERED" && spec.scenario !== "late") {
      await prisma.document.create({
        data: {
          shipmentId: shipment.id,
          name: `${spec.ref}-POD.pdf`,
          type: "POD",
          mimeType: "application/pdf",
          storageKey: `seeded/${spec.ref}/pod.pdf`,
          sizeBytes: 18_000,
        },
      });
    }

    const estimate = spec.mode === "OCEAN" ? 4200 : spec.mode === "AIR" ? 1800 : 1450;
    const invoiceAmount =
      spec.scenario === "late" ? estimate * 1.12 : estimate;
    await prisma.invoice.create({
      data: {
        shipmentId: shipment.id,
        status: spec.status === "DELIVERED" ? "SENT" : "DRAFT",
        estimateAmount: estimate,
        invoiceAmount,
        varianceFlag: Math.abs(invoiceAmount - estimate) > estimate * 0.05,
      },
    });

    await prisma.shipmentComment.create({
      data: {
        shipmentId: shipment.id,
        authorId: ops.id,
        body: `Seed note: scenario=${spec.scenario} for demo walkthrough.`,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: tenant.id,
        actorId: ops.id,
        action: "shipment.created",
        entityType: "Shipment",
        entityId: shipment.id,
        summary: `Seeded ${spec.ref}`,
        after: { status: spec.status, scenario: spec.scenario },
      },
    });

    await evaluateShipmentExceptions(shipment.id);
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: ops.id,
        title: "Welcome to Laneclock",
        body: "Seeded demo world is ready. Open Exceptions and Analytics.",
      },
      {
        userId: client.id,
        title: "Shipment update",
        body: "LC-2026-00001 delivered on time.",
      },
    ],
  });

  // silence unused
  void globex;

  console.log("Seed complete.");
  console.log("Demo accounts (password: demo1234):");
  console.log("  admin@laneclock.demo  ADMIN");
  console.log("  ops@laneclock.demo    OPS");
  console.log("  client@laneclock.demo CLIENT (Acme)");
  console.log("Sample public track token for LC-2026-00001:");
  console.log(`  ${trackingTokens["LC-2026-00001"]}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
