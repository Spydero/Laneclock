import { Router } from "express";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles, type AuthedRequest } from "../middleware/auth.js";
import { param } from "../lib/params.js";

export const adminRouter = Router();

adminRouter.get(
  "/organizations",
  requireAuth,
  requireRoles("ADMIN"),
  async (_req, res) => {
    const organizations = await prisma.organization.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ organizations });
  }
);

adminRouter.post(
  "/organizations/:id/approve",
  requireAuth,
  requireRoles("ADMIN"),
  async (req: AuthedRequest, res) => {
    const org = await prisma.organization.update({
      where: { id: param(req, "id") },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });
    await writeAudit({
      organizationId: req.membership!.organizationId,
      actorId: req.userId,
      action: "org.approved",
      entityType: "Organization",
      entityId: org.id,
      summary: `Approved ${org.name}`,
      after: { approvalStatus: org.approvalStatus },
    });
    res.json({ organization: org });
  }
);

adminRouter.post(
  "/organizations/:id/reject",
  requireAuth,
  requireRoles("ADMIN"),
  async (req: AuthedRequest, res) => {
    const reason = typeof req.body?.reason === "string" ? req.body.reason : "Rejected";
    const org = await prisma.organization.update({
      where: { id: param(req, "id") },
      data: {
        approvalStatus: "REJECTED",
        rejectionReason: reason,
      },
    });
    await writeAudit({
      organizationId: req.membership!.organizationId,
      actorId: req.userId,
      action: "org.rejected",
      entityType: "Organization",
      entityId: org.id,
      summary: `Rejected ${org.name}`,
      after: { approvalStatus: org.approvalStatus, reason },
    });
    res.json({ organization: org });
  }
);

adminRouter.get("/users", requireAuth, requireRoles("ADMIN"), async (_req, res) => {
  const users = await prisma.user.findMany({
    include: {
      memberships: { include: { organization: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});
