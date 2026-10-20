import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "OPS", "CLIENT"]);
export type Role = z.infer<typeof RoleSchema>;

export const FreightModeSchema = z.enum(["FTL", "LTL", "OCEAN", "AIR", "RAIL"]);
export type FreightMode = z.infer<typeof FreightModeSchema>;

export const ShipmentStatusSchema = z.enum([
  "BOOKED",
  "DISPATCHED",
  "AT_PICKUP",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
  "ON_HOLD",
  "CANCELLED",
]);
export type ShipmentStatus = z.infer<typeof ShipmentStatusSchema>;

export const ShipmentPhaseTypeSchema = z.enum([
  "BOOKED",
  "DISPATCHED",
  "AT_PICKUP",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
]);
export type ShipmentPhaseType = z.infer<typeof ShipmentPhaseTypeSchema>;

export const PHASE_ORDER: ShipmentPhaseType[] = [
  "BOOKED",
  "DISPATCHED",
  "AT_PICKUP",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
];

export const SlaOutcomeSchema = z.enum(["EARLY", "ON_TIME", "LATE", "PENDING"]);
export type SlaOutcome = z.infer<typeof SlaOutcomeSchema>;

export const DelayReasonSchema = z.enum([
  "TRAFFIC",
  "WEATHER",
  "DOCK_CONGESTION",
  "DOCS",
  "CUSTOMS",
  "CARRIER",
  "OTHER",
]);
export type DelayReason = z.infer<typeof DelayReasonSchema>;

export const ExceptionSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);
export type ExceptionSeverity = z.infer<typeof ExceptionSeveritySchema>;

export const ExceptionTypeSchema = z.enum([
  "LATE_VS_ETA",
  "DWELL_OVER_THRESHOLD",
  "MISSED_PHASE",
  "ON_HOLD_TOO_LONG",
  "MISSING_POD",
  "AT_RISK",
]);
export type ExceptionType = z.infer<typeof ExceptionTypeSchema>;

export const ExceptionStatusSchema = z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]);
export type ExceptionStatus = z.infer<typeof ExceptionStatusSchema>;

export const DocumentTypeSchema = z.enum([
  "BOL",
  "POD",
  "PACKING_LIST",
  "INVOICE",
  "OTHER",
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const InvoiceStatusSchema = z.enum(["DRAFT", "SENT", "PAID", "DISPUTED"]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

export const OrgApprovalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type OrgApprovalStatus = z.infer<typeof OrgApprovalStatusSchema>;

export const LocationTypeSchema = z.enum(["PORT", "WAREHOUSE", "HUB", "CITY", "AIRPORT"]);
export type LocationType = z.infer<typeof LocationTypeSchema>;

/** Default grace window in hours for on-time delivery */
export const DEFAULT_SLA_GRACE_HOURS = 4;

/** Dwell threshold hours before exception */
export const DEFAULT_DWELL_THRESHOLD_HOURS = 8;

/** On-hold threshold hours before exception */
export const DEFAULT_HOLD_THRESHOLD_HOURS = 24;

export function hoursBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

export function computeSlaOutcome(
  promisedEta: Date | null | undefined,
  actualDelivery: Date | null | undefined,
  graceHours = DEFAULT_SLA_GRACE_HOURS
): SlaOutcome {
  if (!promisedEta) return "PENDING";
  if (!actualDelivery) return "PENDING";
  const diffHours = hoursBetween(promisedEta, actualDelivery);
  const earlyHours = hoursBetween(actualDelivery, promisedEta);
  if (actualDelivery.getTime() < promisedEta.getTime() - graceHours * 3600_000) {
    return "EARLY";
  }
  if (actualDelivery.getTime() <= promisedEta.getTime() + graceHours * 3600_000) {
    return "ON_TIME";
  }
  // silence unused if early path took earlyHours
  void earlyHours;
  void diffHours;
  return "LATE";
}

export function isOtif(outcome: SlaOutcome, inFull: boolean): boolean {
  return (outcome === "EARLY" || outcome === "ON_TIME") && inFull;
}

export const CreateShipmentSchema = z.object({
  customerOrgId: z.string().min(1),
  carrierId: z.string().optional().nullable(),
  laneId: z.string().optional().nullable(),
  mode: FreightModeSchema,
  originLocationId: z.string().min(1),
  destinationLocationId: z.string().min(1),
  promisedEtd: z.string().datetime().optional().nullable(),
  promisedEta: z.string().datetime().optional().nullable(),
  weightKg: z.number().positive().optional().nullable(),
  packageCount: z.number().int().positive().optional().nullable(),
  containerCount: z.number().int().positive().optional().nullable(),
  commodity: z.string().optional().nullable(),
  hazmat: z.boolean().optional(),
  assigneeId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateShipmentInput = z.infer<typeof CreateShipmentSchema>;

export const UpdateShipmentSchema = CreateShipmentSchema.partial().extend({
  status: ShipmentStatusSchema.optional(),
  holdReason: z.string().optional().nullable(),
  delayReason: DelayReasonSchema.optional().nullable(),
  inFull: z.boolean().optional(),
});
export type UpdateShipmentInput = z.infer<typeof UpdateShipmentSchema>;

export const LogPhaseSchema = z.object({
  phase: ShipmentPhaseTypeSchema,
  actualStartAt: z.string().datetime().optional(),
  actualEndAt: z.string().datetime().optional().nullable(),
  locationLabel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  delayReason: DelayReasonSchema.optional().nullable(),
});
export type LogPhaseInput = z.infer<typeof LogPhaseSchema>;

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const ResolveExceptionSchema = z.object({
  note: z.string().min(1).max(2000),
});

export const AcknowledgeExceptionSchema = z.object({
  note: z.string().max(2000).optional(),
});

export const AnalyticsFilterSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  carrierId: z.string().optional(),
  laneId: z.string().optional(),
  mode: FreightModeSchema.optional(),
  customerOrgId: z.string().optional(),
});
export type AnalyticsFilter = z.infer<typeof AnalyticsFilterSchema>;
