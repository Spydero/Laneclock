import { Router } from "express";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { getCarrierScorecard, getLanePerformance, getCommandDashboard } from "../services/analytics.js";
import { param } from "../lib/params.js";

export const aiRouter = Router();

aiRouter.get("/status", requireAuth, (_req, res) => {
  res.json({ enabled: Boolean(env.GEMINI_API_KEY) });
});

async function callGemini(prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error: ${response.status} ${text}`);
  }
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response from model.";
}

aiRouter.post(
  "/explain-delay/:shipmentId",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    if (!env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "AI disabled. Set GEMINI_API_KEY",
        code: "AI_DISABLED",
      });
    }
    const shipment = await prisma.shipment.findFirst({
      where: {
        id: param(req, "shipmentId"),
        tenantOrgId: req.membership!.organizationId,
      },
      include: {
        phases: true,
        exceptions: true,
        carrier: true,
        lane: true,
        originLocation: true,
        destinationLocation: true,
      },
    });
    if (!shipment) return res.status(404).json({ error: "Not found", code: "NOT_FOUND" });

    const prompt = `You are a freight control-tower analyst. Explain why this shipment may be delayed or how time performance looks, in 3-5 short sentences for ops. Use only the facts below. No fluff.

Reference: ${shipment.referenceCode}
Status: ${shipment.status}
SLA outcome: ${shipment.slaOutcome}
OTIF: ${shipment.otif}
Promised ETA: ${shipment.promisedEta?.toISOString() ?? "n/a"}
Actual delivery: ${shipment.actualDeliveryAt?.toISOString() ?? "n/a"}
Pickup dwell hours: ${shipment.pickupDwellHours ?? "n/a"}
Transit hours: ${shipment.transitHours ?? "n/a"}
Delivery dwell hours: ${shipment.deliveryDwellHours ?? "n/a"}
Cycle time hours: ${shipment.cycleTimeHours ?? "n/a"}
Delay reason: ${shipment.delayReason ?? "n/a"}
Carrier: ${shipment.carrier?.name ?? "n/a"}
Lane: ${shipment.lane?.name ?? "n/a"}
Origin: ${shipment.originLocation.name}
Destination: ${shipment.destinationLocation.name}
Open exceptions: ${shipment.exceptions
      .filter((e) => e.status !== "RESOLVED")
      .map((e) => `${e.type}: ${e.title}`)
      .join("; ") || "none"}
Phases: ${shipment.phases
      .map(
        (p) =>
          `${p.phase} actualStart=${p.actualStartAt?.toISOString() ?? "pending"} end=${p.actualEndAt?.toISOString() ?? "n/a"}`
      )
      .join(" | ")}
`;

    try {
      const text = await callGemini(prompt);
      res.json({ explanation: text });
    } catch (err) {
      console.error(err);
      res.status(502).json({ error: "Gemini request failed", code: "AI_ERROR" });
    }
  }
);

aiRouter.post(
  "/weekly-brief",
  requireAuth,
  requireRoles("ADMIN", "OPS"),
  async (req: AuthedRequest, res) => {
    if (!env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: "AI disabled. Set GEMINI_API_KEY",
        code: "AI_DISABLED",
      });
    }
    const q = { tenantOrgId: req.membership!.organizationId };
    const [dashboard, lanes, carriers] = await Promise.all([
      getCommandDashboard(q),
      getLanePerformance(q),
      getCarrierScorecard(q),
    ]);
    const worstLanes = [...lanes]
      .filter((l) => l.otifPercent != null)
      .sort((a, b) => (a.otifPercent ?? 100) - (b.otifPercent ?? 100))
      .slice(0, 5);
    const prompt = `Write a concise weekly freight ops brief (bullet points, max 180 words) for Laneclock control tower.
KPIs: ${JSON.stringify(dashboard)}
Worst lanes by OTIF: ${JSON.stringify(worstLanes)}
Carrier scorecards: ${JSON.stringify(carriers.slice(0, 5))}
Highlight top 3 actions ops should take.`;

    try {
      const text = await callGemini(prompt);
      res.json({ brief: text });
    } catch (err) {
      console.error(err);
      res.status(502).json({ error: "Gemini request failed", code: "AI_ERROR" });
    }
  }
);
