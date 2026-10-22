"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { AuditLog, Exception, MeResponse } from "@/lib/types";

export default function CommandPage() {
  const [dash, setDash] = useState<{
    active: number;
    delayed: number;
    exceptionsOpen: number;
    delivered: number;
    avgCycleTimeHours: number;
    otifPercent: number;
  } | null>(null);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [feed, setFeed] = useState<AuditLog[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    api<MeResponse>("/v1/me").then(setMe).catch(() => undefined);
    api<typeof dash>("/v1/analytics/dashboard").then(setDash).catch(() => undefined);
    api<{ logs: AuditLog[] }>("/v1/audit/feed")
      .then((r) => setFeed(r.logs))
      .catch(() => undefined);
    api<{ exceptions: Exception[] }>("/v1/exceptions")
      .then((r) => setExceptions(r.exceptions.slice(0, 6)))
      .catch(() => undefined);
  }, []);

  const isClient = me?.membership?.role === "CLIENT";
  const pending =
    isClient && me?.membership?.organization.approvalStatus === "PENDING";
  const rejected =
    isClient && me?.membership?.organization.approvalStatus === "REJECTED";

  if (pending || rejected) {
    return (
      <div className="mx-auto max-w-lg space-y-4 panel p-8 text-center">
        <h1 className="font-display text-3xl">
          {rejected ? "Access denied" : "Awaiting approval"}
        </h1>
        <p className="text-sand-400">
          {rejected
            ? "An Admin rejected your company. Reach out to Laneclock ops to resolve."
            : `Thanks for registering ${me?.membership?.organization.name}. An Admin must approve your company before you can view shipments, tracking details, and SLA analytics.`}
        </p>
        <p className="text-sm text-sand-400">
          Status:{" "}
          <span className="font-mono text-teal-300">
            {me?.membership?.organization.approvalStatus}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-sand-100">
          {isClient ? "Your SLA overview" : "Command tower"}
        </h1>
        <p className="mt-1 text-sand-400">
          {isClient
            ? "On-time performance across your shipments."
            : "Active clocks, open exceptions, and recent audit activity."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active" value={dash?.active ?? "-"} />
        <StatCard label="Delayed" value={dash?.delayed ?? "-"} hint="SLA late" />
        <StatCard label="Exceptions" value={dash?.exceptionsOpen ?? "-"} />
        <StatCard label="Delivered" value={dash?.delivered ?? "-"} />
        <StatCard
          label="Avg cycle"
          value={dash ? `${dash.avgCycleTimeHours.toFixed(1)}h` : "-"}
        />
        <StatCard
          label="OTIF"
          value={dash ? `${dash.otifPercent.toFixed(0)}%` : "-"}
          hint="On-time in-full"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {!isClient && (
          <section className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">Exception inbox</h2>
              <Link href="/app/exceptions" className="text-sm text-teal-300 hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-3">
              {exceptions.length === 0 && (
                <li className="text-sm text-sand-400">No open exceptions.</li>
              )}
              {exceptions.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-teal-400/10 bg-ink-900/50 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-sand-100">{ex.title}</div>
                    <div className="text-xs text-sand-400">
                      {ex.shipment?.referenceCode} · {ex.severity}
                    </div>
                  </div>
                  <span className="badge bg-signal-warn/20 text-signal-warn">{ex.type}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Activity</h2>
            {!isClient && (
              <Link href="/app/audit" className="text-sm text-teal-300 hover:underline">
                Audit log
              </Link>
            )}
          </div>
          <ul className="space-y-3">
            {feed.slice(0, 8).map((log) => (
              <li key={log.id} className="border-b border-teal-400/10 pb-2 text-sm last:border-0">
                <div className="text-sand-100">{log.summary ?? log.action}</div>
                <div className="text-xs text-sand-400">
                  {log.actor?.name ?? "System"} · {fmtDate(log.createdAt)}
                </div>
              </li>
            ))}
            {feed.length === 0 && <li className="text-sm text-sand-400">No activity yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
