export type MeResponse = {
  user: { id: string; email: string; name: string };
  membership: {
    id: string;
    role: "ADMIN" | "OPS" | "CLIENT";
    organizationId: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      approvalStatus: string;
    };
  } | null;
};

export type Shipment = {
  id: string;
  referenceCode: string;
  status: string;
  mode: string;
  promisedEta?: string | null;
  promisedEtd?: string | null;
  actualDeliveryAt?: string | null;
  slaOutcome: string;
  otif: boolean;
  pickupDwellHours?: number | null;
  transitHours?: number | null;
  deliveryDwellHours?: number | null;
  cycleTimeHours?: number | null;
  delayReason?: string | null;
  holdReason?: string | null;
  commodity?: string | null;
  trackingTokenHint?: string;
  originLocation?: { name: string; code: string; city?: string | null; country: string };
  destinationLocation?: { name: string; code: string; city?: string | null; country: string };
  carrier?: { id: string; name: string; code: string } | null;
  lane?: { id: string; name: string; expectedTransitHours: number } | null;
  customerOrg?: { id: string; name: string };
  phases?: Phase[];
  exceptions?: Exception[];
  documents?: Document[];
  comments?: Comment[];
  invoice?: Invoice | null;
  assignee?: { id: string; name: string; email: string } | null;
};

export type Phase = {
  id?: string;
  phase: string;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  locationLabel?: string | null;
  notes?: string | null;
};

export type Exception = {
  id: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  resolveNote?: string | null;
  createdAt: string;
  shipment?: { id: string; referenceCode: string; status: string; promisedEta?: string | null };
};

export type Document = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

export type Invoice = {
  id: string;
  status: string;
  estimateAmount: string | number;
  invoiceAmount: string | number;
  varianceFlag: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  createdAt: string;
  actor?: { id: string; name: string; email: string } | null;
};
