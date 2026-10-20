import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const meRouter = Router();

meRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId! },
    include: {
      organization: true,
    },
  });
  res.json({
    user: {
      id: req.userId,
      email: req.userEmail,
      name: req.userName,
    },
    membership: req.membership ?? null,
    memberships,
  });
});
