import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { env } from "./lib/env.js";
import { adminRouter } from "./routes/admin.js";
import { aiRouter } from "./routes/ai.js";
import { analyticsRouter } from "./routes/analytics.js";
import { auditRouter } from "./routes/audit.js";
import { catalogRouter } from "./routes/catalog.js";
import { exceptionsRouter } from "./routes/exceptions.js";
import { exportRouter } from "./routes/export.js";
import { meRouter } from "./routes/me.js";
import { notificationsRouter } from "./routes/notifications.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { searchRouter } from "./routes/search.js";
import { shipmentsRouter } from "./routes/shipments.js";
import { trackRouter } from "./routes/track.js";

export function createApp() {
  const app = express();

  const allowedOrigins = new Set([
    env.CORS_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || allowedOrigins.has(origin) || /^http:\/\/192\.168\.\d+\.\d+:3000$/.test(origin)) {
          cb(null, true);
          return;
        }
        cb(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  // Better Auth must be mounted before body parsers (Express 4 path-to-regexp)
  app.all("/api/auth/*", toNodeHandler(auth));
  app.all("/api/auth", toNodeHandler(auth));

  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true, service: "laneclock-api" }));

  app.use("/v1/me", meRouter);
  app.use("/v1/onboarding", onboardingRouter);
  app.use("/v1/shipments", shipmentsRouter);
  app.use("/v1/track", trackRouter);
  app.use("/v1/exceptions", exceptionsRouter);
  app.use("/v1/audit", auditRouter);
  app.use("/v1/analytics", analyticsRouter);
  app.use("/v1/catalog", catalogRouter);
  app.use("/v1/admin", adminRouter);
  app.use("/v1/notifications", notificationsRouter);
  app.use("/v1/search", searchRouter);
  app.use("/v1/ai", aiRouter);
  app.use("/v1/export", exportRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
  });

  return app;
}
