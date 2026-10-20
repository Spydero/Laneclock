"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Carrier = {
  id: string;
  name: string;
  code: string;
  modes: string[];
  contactEmail?: string | null;
};

type Score = {
  carrierId: string;
  name: string;
  otifPercent: number;
  volume: number;
  avgDelayHours: number;
  exceptionRate: number;
};

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [scores, setScores] = useState<Score[]>([]);

  useEffect(() => {
    api<{ carriers: Carrier[] }>("/v1/catalog/carriers").then((r) => setCarriers(r.carriers));
    api<{ carriers: Score[] }>("/v1/analytics/carriers").then((r) => setScores(r.carriers));
  }, []);

  const scoreMap = Object.fromEntries(scores.map((s) => [s.carrierId, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Carriers</h1>
        <p className="text-sand-400">Profiles + performance scorecards.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {carriers.map((c) => {
          const s = scoreMap[c.id];
          return (
            <div key={c.id} className="panel p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl">{c.name}</h2>
                  <p className="font-mono text-sm text-teal-300">{c.code}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.modes.map((m) => (
                    <span key={m} className="badge bg-ink-700 text-sand-200">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm text-sand-400">{c.contactEmail ?? "No contact"}</p>
              {s && (
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-sand-400">OTIF</dt>
                    <dd className="font-display text-xl">{s.otifPercent.toFixed(0)}%</dd>
                  </div>
                  <div>
                    <dt className="text-sand-400">Volume</dt>
                    <dd className="font-display text-xl">{s.volume}</dd>
                  </div>
                  <div>
                    <dt className="text-sand-400">Avg delay</dt>
                    <dd>{s.avgDelayHours.toFixed(1)}h</dd>
                  </div>
                  <div>
                    <dt className="text-sand-400">Exception rate</dt>
                    <dd>{s.exceptionRate.toFixed(0)}%</dd>
                  </div>
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
