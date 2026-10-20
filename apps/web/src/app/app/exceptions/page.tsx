"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { Exception } from "@/lib/types";

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [atRisk, setAtRisk] = useState<Exception[]>([]);
  const [note, setNote] = useState("");

  function load() {
    api<{ exceptions: Exception[] }>("/v1/exceptions").then((r) => setExceptions(r.exceptions));
    api<{ exceptions: Exception[] }>("/v1/exceptions/at-risk").then((r) => setAtRisk(r.exceptions));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Exceptions</h1>
          <p className="text-sand-400">Rule-driven inbox — manage by exception.</p>
        </div>
        <button
          className="btn-ghost"
          onClick={async () => {
            await api("/v1/exceptions/evaluate", { method: "POST", body: "{}" });
            load();
          }}
        >
          Re-evaluate rules
        </button>
      </div>

      <section className="panel p-5">
        <h2 className="mb-3 font-display text-2xl">At-risk board</h2>
        {atRisk.length === 0 ? (
          <p className="text-sm text-sand-400">No at-risk shipments.</p>
        ) : (
          <ul className="space-y-2">
            {atRisk.map((ex) => (
              <li key={ex.id} className="flex justify-between text-sm">
                <Link
                  href={`/app/shipments/${ex.shipment?.id}`}
                  className="font-mono text-teal-300 hover:underline"
                >
                  {ex.shipment?.referenceCode}
                </Link>
                <span className="text-sand-400">{ex.description}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-teal-400/15 text-xs uppercase text-sand-400">
            <tr>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((ex) => (
              <tr key={ex.id} className="border-b border-teal-400/10">
                <td className="px-4 py-3">
                  <Link
                    href={`/app/shipments/${ex.shipment?.id}`}
                    className="font-mono text-teal-300 hover:underline"
                  >
                    {ex.shipment?.referenceCode}
                  </Link>
                </td>
                <td className="px-4 py-3">{ex.type}</td>
                <td className="px-4 py-3">{ex.severity}</td>
                <td className="px-4 py-3">
                  <div>{ex.title}</div>
                  <div className="text-xs text-sand-400">{ex.description}</div>
                </td>
                <td className="px-4 py-3 text-sand-400">{fmtDate(ex.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button
                      className="btn-ghost py-1 text-xs"
                      onClick={async () => {
                        await api(`/v1/exceptions/${ex.id}/acknowledge`, {
                          method: "POST",
                          body: JSON.stringify({ note }),
                        });
                        load();
                      }}
                    >
                      Ack
                    </button>
                    <button
                      className="btn-primary py-1 text-xs"
                      onClick={async () => {
                        await api(`/v1/exceptions/${ex.id}/resolve`, {
                          method: "POST",
                          body: JSON.stringify({ note: note || "Resolved in demo" }),
                        });
                        load();
                      }}
                    >
                      Resolve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className="label">Resolve / ack note</label>
        <input className="input max-w-md" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </div>
  );
}
