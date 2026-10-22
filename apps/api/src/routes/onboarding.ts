import { Router } from "express";
import { writeAudit } from "../lib/audit.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const onboardingRouter = Router();

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "company";
}

/**
 * After Better Auth sign-up, authenticated clients call this once to attach a
 * PENDING organization. Nobody can self-assign OPS/ADMIN here.
 */
onboardingRouter.post("/client", requireAuth, async (req: AuthedRequest, res) => {
  const companyName =
    typeof req.body?.companyName === "string" ? req.body.companyName.trim() : "";
  if (companyName.length < 2) {
    return res.status(400).json({ error: "Company name required", code: "VALIDATION" });
  }

  const existing = await prisma.membership.findFirst({
    where: { userId: req.userId! },
  });
  if (existing) {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: existing.organizationId },
    });
    return res.json({
      membership: existing,
      organization,
      alreadyOnboarded: true,
    });
  }

  let slug = slugify(companyName);
  const clash = await prisma.organization.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  const organization = await prisma.organization.create({
    data: {
      name: companyName,
      slug,
      approvalStatus: "PENDING",
      members: {
        create: {
          userId: req.userId!,
          role: "CLIENT",
        },
      },
    },
    include: { members: true },
  });

  await writeAudit({
    organizationId: organization.id,
    actorId: req.userId,
    action: "org.registered",
    entityType: "Organization",
    entityId: organization.id,
    summary: `Client registered ${organization.name} (pending approval)`,
    after: { approvalStatus: "PENDING", slug: organization.slug },
  });

  const membership = organization.members[0];
  res.status(201).json({
    membership,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      approvalStatus: organization.approvalStatus,
    },
    alreadyOnboarded: false,
  });
});
