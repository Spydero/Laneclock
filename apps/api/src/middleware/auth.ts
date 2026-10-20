import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

export type AuthedRequest = Request & {
  userId?: string;
  userEmail?: string;
  userName?: string;
  membership?: {
    id: string;
    role: Role;
    organizationId: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      approvalStatus: string;
    };
  };
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    }
    req.userId = session.user.id;
    req.userEmail = session.user.email;
    req.userName = session.user.name;

    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true, approvalStatus: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    if (membership) {
      req.membership = membership;
    }
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.membership || !roles.includes(req.membership.role)) {
      return res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
    }
    next();
  };
}

export function requireApprovedClient(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.membership?.role === "CLIENT" && req.membership.organization.approvalStatus !== "APPROVED") {
    return res.status(403).json({
      error: "Company pending approval",
      code: "ORG_PENDING",
    });
  }
  next();
}
