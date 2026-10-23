"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate, fmtHours, slaColor, statusColor } from "@/lib/format";
import { formatFacility } from "@/lib/locations";
import type { MeResponse, Shipment } from "@/lib/types";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    api<{ shipments: Shipment[] }>(`/v1/shipments?${params}`)
      .then((r) => setShipments(r.shipments))
      .catch(() => setShipments([]));
  }

  async function exportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/v1/export/shipments.csv", { credentials: "include" });
      if (!res.ok) {
        let message = "Export failed";
        try {
          const body = (await res.json()) as { error?: string };
          if (typeof body.error === "string") message = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "laneclock-shipments.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    api<MeResponse>("/v1/me").then(setMe).catch(() => undefined);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canCreate = me?.membership?.role === "OPS" || me?.membership?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Shipments</h1>
          <p className="text-sand-400">Phase clocks, SLA outcomes, and cargo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={exportCsv} disabled={exporting}>
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          {canCreate && (
            <Link href="/app/shipments/new" className="btn-primary">
              New shipment
            </Link>
          )}
        </div>
      </div>
      {exportError && <p className="text-sm text-signal-late">{exportError}</p>}

      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search reference…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select className="input max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {[
            "BOOKED",
            "DISPATCHED",
            "AT_PICKUP",
            "IN_TRANSIT",
            "AT_DELIVERY",
            "DELIVERED",
            "ON_HOLD",
            "CANCELLED",
          ].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={load}>
          Filter
        </button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-teal-400/15 text-xs uppercase tracking-wide text-sand-400">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Lane</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">ETA</th>
              <th className="px-4 py-3">Carrier</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((s) => (
              <tr key={s.id} className="border-b border-teal-400/10 hover:bg-ink-700/40">
                <td className="px-4 py-3">
                  <Link href={`/app/shipments/${s.id}`} className="font-mono text-teal-300 hover:underline">
                    {s.referenceCode}
                  </Link>
                  <div className="text-xs text-sand-400">{s.mode}</div>
                </td>
                <td className="px-4 py-3 text-sand-200">
                  {formatFacility(s.originLocation)} → {formatFacility(s.destinationLocation)}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusColor(s.status)}`}>{s.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${slaColor(s.slaOutcome)}`}>{s.slaOutcome}</span>
                  {s.otif ? <span className="ml-1 text-xs text-signal-ok">OTIF</span> : null}
                </td>
                <td className="px-4 py-3 font-mono text-sand-200">{fmtHours(s.cycleTimeHours)}</td>
                <td className="px-4 py-3 text-sand-400">{fmtDate(s.promisedEta)}</td>
                <td className="px-4 py-3">{s.carrier?.name ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shipments.length === 0 && (
          <p className="p-6 text-center text-sand-400">No shipments match.</p>
        )}
      </div>
    </div>
  );
}
