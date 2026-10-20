"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { AuditLog } from "@/lib/types";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (entityType) params.set("entityType", entityType);
    api<{ logs: AuditLog[] }>(`/v1/audit?${params}`).then((r) => setLogs(r.logs));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Audit log</h1>
        <p className="text-sand-400">Append-only. Searchable. Before/after diffs.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search summary / action…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          className="input max-w-[180px]"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All entities</option>
          {["Shipment", "ShipmentPhase", "Exception", "Document", "Organization"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn-ghost" onClick={load}>
          Search
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="panel overflow-x-auto lg:col-span-3">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-teal-400/15 text-xs uppercase text-sand-400">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="cursor-pointer border-b border-teal-400/10 hover:bg-ink-700/40"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3 text-sand-400">{fmtDate(log.createdAt)}</td>
                  <td className="px-4 py-3">{log.actor?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-teal-300">{log.action}</td>
                  <td className="px-4 py-3">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel p-5 lg:col-span-2">
          <h2 className="font-display text-xl">Diff</h2>
          {!selected ? (
            <p className="mt-2 text-sm text-sand-400">Select a row.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <div className="label">Entity</div>
                <div className="font-mono text-xs">
                  {selected.entityType} / {selected.entityId}
                </div>
              </div>
              <div>
                <div className="label">Before</div>
                <pre className="overflow-auto rounded-lg bg-ink-900 p-2 text-xs text-sand-200">
                  {JSON.stringify(selected.before ?? null, null, 2)}
                </pre>
              </div>
              <div>
                <div className="label">After</div>
                <pre className="overflow-auto rounded-lg bg-ink-900 p-2 text-xs text-sand-200">
                  {JSON.stringify(selected.after ?? null, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
