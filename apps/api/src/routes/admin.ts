import { hashPassword } from "better-auth/crypto";
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

/**
 * Admins only may create OPS (or additional ADMIN) staff on the tenant org.
 * Clients must self-register via /register; never created here as CLIENT.
 */
adminRouter.post("/staff", requireAuth, requireRoles("ADMIN"), async (req: AuthedRequest, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const role = req.body?.role === "ADMIN" ? "ADMIN" : "OPS";

  if (!email || !name || password.length < 8) {
    return res.status(400).json({
      error: "name, email, and password (min 8) required",
      code: "VALIDATION",
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered", code: "CONFLICT" });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        emailVerified: true,
      },
    });
    await tx.account.create({
      data: {
        userId: created.id,
        accountId: created.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
    await tx.membership.create({
      data: {
        userId: created.id,
        organizationId: req.membership!.organizationId,
        role,
      },
    });
    return created;
  });

  await writeAudit({
    organizationId: req.membership!.organizationId,
    actorId: req.userId,
    action: "staff.created",
    entityType: "User",
    entityId: user.id,
    summary: `Created ${role} staff ${email}`,
    after: { email, role },
  });

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    },
  });
});
