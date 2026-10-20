"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { api } from "@/lib/api";
import { fmtDate, fmtHours, slaColor, statusColor } from "@/lib/format";
import type { Shipment } from "@/lib/types";

export default function PublicTrackPage() {
  const { token } = useParams<{ token: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<{ shipment: Shipment }>(`/v1/track/${token}`)
      .then((r) => setShipment(r.shipment))
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-sand-400">
        Tracking link not found.
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-sand-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-hero-glow px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/" className="font-display text-2xl text-sand-100">
          Lane<span className="text-teal-400">clock</span>
        </Link>
        <div className="panel p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-teal-300">Public track</p>
          <h1 className="mt-2 font-display text-4xl">{shipment.referenceCode}</h1>
          <p className="mt-1 text-sand-400">
            {shipment.originLocation?.name} → {shipment.destinationLocation?.name}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`badge ${statusColor(shipment.status)}`}>{shipment.status}</span>
            <span className={`badge ${slaColor(shipment.slaOutcome)}`}>{shipment.slaOutcome}</span>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-sand-400">Promised ETA</dt>
              <dd>{fmtDate(shipment.promisedEta)}</dd>
            </div>
            <div>
              <dt className="text-sand-400">Cycle time</dt>
              <dd>{fmtHours(shipment.cycleTimeHours)}</dd>
            </div>
            <div>
              <dt className="text-sand-400">Transit</dt>
              <dd>{fmtHours(shipment.transitHours)}</dd>
            </div>
            <div>
              <dt className="text-sand-400">Carrier</dt>
              <dd>{shipment.carrier?.name ?? "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="panel p-6">
          <h2 className="mb-4 font-display text-2xl">Timeline</h2>
          <PhaseTimeline phases={shipment.phases ?? []} />
        </div>
      </div>
    </div>
  );
}
