import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export async function writeAudit(input: {
  organizationId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      organizationId: input.organizationId ?? undefined,
      actorId: input.actorId ?? undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      before: input.before,
      after: input.after,
    },
  });
}
