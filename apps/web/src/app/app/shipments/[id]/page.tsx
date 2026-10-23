"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PhaseTimeline } from "@/components/PhaseTimeline";
import { api } from "@/lib/api";
import { fmtDate, fmtHours, slaColor, statusColor } from "@/lib/format";
import type { MeResponse, Shipment } from "@/lib/types";

const PHASES = ["BOOKED", "DISPATCHED", "AT_PICKUP", "IN_TRANSIT", "AT_DELIVERY", "DELIVERED"] as const;

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [comment, setComment] = useState("");
  const [phase, setPhase] = useState<string>("IN_TRANSIT");
  const [trackToken, setTrackToken] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ shipment: Shipment }>(`/v1/shipments/${id}`)
      .then((r) => setShipment(r.shipment))
      .catch(() => setShipment(null));
  }, [id]);

  useEffect(() => {
    api<MeResponse>("/v1/me").then(setMe).catch(() => undefined);
    load();
  }, [load]);

  const isOps = me?.membership?.role === "OPS" || me?.membership?.role === "ADMIN";

  if (!shipment) {
    return <p className="text-sand-400">Loading shipment…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app/shipments" className="text-sm text-teal-300 hover:underline">
            ← Shipments
          </Link>
          <h1 className="mt-2 font-display text-4xl font-normal tracking-tight">
            <span className="font-mono text-teal-300">{shipment.referenceCode}</span>
          </h1>
          <p className="mt-1 text-sand-400">
            {shipment.originLocation?.name}
            {shipment.originLocation?.city ? ` (${shipment.originLocation.city})` : ""}
            {" → "}
            {shipment.destinationLocation?.name}
            {shipment.destinationLocation?.city ? ` (${shipment.destinationLocation.city})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${statusColor(shipment.status)}`}>{shipment.status}</span>
          <span className={`badge ${slaColor(shipment.slaOutcome)}`}>{shipment.slaOutcome}</span>
          {shipment.otif && <span className="badge bg-signal-ok/20 text-signal-ok">OTIF</span>}
        </div>
      </div>

      {msg && <p className="text-sm text-teal-300">{msg}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Pickup dwell", fmtHours(shipment.pickupDwellHours)],
          ["Transit", fmtHours(shipment.transitHours)],
          ["Delivery dwell", fmtHours(shipment.deliveryDwellHours)],
          ["Cycle time", fmtHours(shipment.cycleTimeHours)],
        ].map(([k, v]) => (
          <div key={k} className="panel p-4">
            <div className="text-xs text-sand-400">{k}</div>
            <div className="font-display text-2xl">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="panel p-5 lg:col-span-3">
          <h2 className="mb-4 font-display text-2xl">Phase clock</h2>
          <PhaseTimeline phases={shipment.phases ?? []} />
          {isOps && (
            <div className="mt-6 flex flex-wrap items-end gap-2 border-t border-teal-400/10 pt-4">
              <div>
                <label className="label">Log phase</label>
                <select className="input" value={phase} onChange={(e) => setPhase(e.target.value)}>
                  {PHASES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary"
                onClick={async () => {
                  await api(`/v1/shipments/${id}/phases`, {
                    method: "POST",
                    body: JSON.stringify({ phase }),
                  });
                  setMsg(`Logged ${phase}`);
                  load();
                }}
              >
                Log now
              </button>
            </div>
          )}
        </section>

        <section className="space-y-4 lg:col-span-2">
          <div className="panel p-5">
            <h2 className="mb-3 font-display text-2xl">Details</h2>
            <dl className="space-y-2 text-sm">
              <Row k="Mode" v={shipment.mode} />
              <Row k="Carrier" v={shipment.carrier?.name ?? "-"} />
              <Row k="Lane" v={shipment.lane?.name ?? "-"} />
              <Row k="Customer" v={shipment.customerOrg?.name ?? "-"} />
              <Row k="Promised ETA" v={fmtDate(shipment.promisedEta)} />
              <Row k="Actual delivery" v={fmtDate(shipment.actualDeliveryAt)} />
              <Row k="Delay reason" v={shipment.delayReason ?? "-"} />
              <Row k="Hold" v={shipment.holdReason ?? "-"} />
              <Row k="Assignee" v={shipment.assignee?.name ?? "-"} />
            </dl>
          </div>

          {isOps && (
            <div className="panel p-5 space-y-3">
              <h2 className="font-display text-xl">Tracking link</h2>
              <button
                className="btn-ghost w-full"
                onClick={async () => {
                  const r = await api<{ trackingToken: string }>(
                    `/v1/shipments/${id}/tracking-token`,
                    { method: "POST", body: "{}" }
                  );
                  setTrackToken(r.trackingToken);
                }}
              >
                Generate / regenerate
              </button>
              {trackToken && (
                <Link
                  href={`/track/${trackToken}`}
                  className="block break-all font-mono text-xs text-teal-300 hover:underline"
                  target="_blank"
                >
                  /track/{trackToken}
                </Link>
              )}
              <button
                className="btn-ghost w-full"
                onClick={async () => {
                  try {
                    const r = await api<{ explanation: string }>(
                      `/v1/ai/explain-delay/${id}`,
                      { method: "POST", body: "{}" }
                    );
                    setAiText(r.explanation);
                  } catch {
                    setAiText("AI unavailable. Set GEMINI_API_KEY or open /app/ai.");
                  }
                }}
              >
                Explain delay (Gemini)
              </button>
              {aiText && <p className="text-sm text-sand-200 whitespace-pre-wrap">{aiText}</p>}
            </div>
          )}

          <div className="panel p-5">
            <h2 className="mb-3 font-display text-xl">Documents</h2>
            <ul className="space-y-2 text-sm">
              {(shipment.documents ?? []).map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>{d.name}</span>
                  <span className="badge bg-ink-700 text-sand-400">{d.type}</span>
                </li>
              ))}
            </ul>
            {isOps && (
              <button
                className="btn-ghost mt-3 w-full"
                onClick={async () => {
                  await api(`/v1/shipments/${id}/documents`, {
                    method: "POST",
                    body: JSON.stringify({ name: "POD.pdf", type: "POD" }),
                  });
                  load();
                }}
              >
                Attach POD (mock)
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="panel p-5">
        <h2 className="mb-3 font-display text-2xl">Comments</h2>
        <ul className="mb-4 space-y-3">
          {(shipment.comments ?? []).map((c) => (
            <li key={c.id} className="rounded-lg bg-ink-900/60 px-3 py-2 text-sm">
              <div className="text-xs text-sand-400">
                {c.author.name} · {fmtDate(c.createdAt)}
              </div>
              <p className="text-sand-100">{c.body}</p>
            </li>
          ))}
        </ul>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!comment.trim()) return;
            await api(`/v1/shipments/${id}/comments`, {
              method: "POST",
              body: JSON.stringify({ body: comment }),
            });
            setComment("");
            load();
          }}
        >
          <input
            className="input"
            placeholder="Add a note…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button className="btn-primary">Post</button>
        </form>
      </section>

      {(shipment.exceptions ?? []).length > 0 && (
        <section className="panel p-5">
          <h2 className="mb-3 font-display text-2xl">Exceptions</h2>
          <ul className="space-y-2">
            {shipment.exceptions!.map((ex) => (
              <li key={ex.id} className="text-sm">
                <span className="badge bg-signal-warn/20 text-signal-warn mr-2">{ex.severity}</span>
                {ex.title}{" "}
                <span className="text-sand-400">({ex.status})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-sand-400">{k}</dt>
      <dd className="text-right text-sand-100">{v}</dd>
    </div>
  );
}
