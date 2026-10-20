import { FreightModeSchema } from "@laneclock/shared";
import { Router } from "express";
import {
  requireApprovedClient,
  requireAuth,
  type AuthedRequest,
} from "../middleware/auth.js";
import {
  getCarrierScorecard,
  getCommandDashboard,
  getCycleTimeDistribution,
  getDelayPareto,
  getDwellHeatmap,
  getLanePerformance,
  getModeMix,
  getOtifTrend,
  getVolumeVsOntime,
  type AnalyticsQuery,
} from "../services/analytics.js";

export const analyticsRouter = Router();

function parseQuery(req: AuthedRequest): AnalyticsQuery {
  const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
  const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
  const carrierId = typeof req.query.carrierId === "string" ? req.query.carrierId : undefined;
  const laneId = typeof req.query.laneId === "string" ? req.query.laneId : undefined;
  const modeRaw = typeof req.query.mode === "string" ? req.query.mode : undefined;
  const modeParsed = modeRaw ? FreightModeSchema.safeParse(modeRaw) : null;
  const customerOrgId =
    typeof req.query.customerOrgId === "string" ? req.query.customerOrgId : undefined;

  const base: AnalyticsQuery = {
    from,
    to,
    carrierId,
    laneId,
    mode: modeParsed?.success ? modeParsed.data : undefined,
    customerOrgId,
  };

  if (!req.membership) return base;
  if (req.membership.role === "CLIENT") {
    return { ...base, scopeCustomerOrgId: req.membership.organizationId };
  }
  return { ...base, tenantOrgId: req.membership.organizationId };
}

analyticsRouter.get(
  "/dashboard",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    const data = await getCommandDashboard(parseQuery(req));
    res.json(data);
  }
);

analyticsRouter.get(
  "/otif-trend",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ series: await getOtifTrend(parseQuery(req)) });
  }
);

analyticsRouter.get(
  "/cycle-time",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ bins: await getCycleTimeDistribution(parseQuery(req)) });
  }
);

analyticsRouter.get(
  "/dwell",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json(await getDwellHeatmap(parseQuery(req)));
  }
);

analyticsRouter.get(
  "/lanes",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ lanes: await getLanePerformance(parseQuery(req)) });
  }
);

analyticsRouter.get(
  "/carriers",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ carriers: await getCarrierScorecard(parseQuery(req)) });
  }
);

analyticsRouter.get(
  "/modes",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ modes: await getModeMix(parseQuery(req)) });
  }
);

analyticsRouter.get(
  "/delay-pareto",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ reasons: await getDelayPareto(parseQuery(req)) });
  }
);

analyticsRouter.get(
  "/volume-ontime",
  requireAuth,
  requireApprovedClient,
  async (req: AuthedRequest, res) => {
    res.json({ series: await getVolumeVsOntime(parseQuery(req)) });
  }
);
