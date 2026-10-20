"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Shipment } from "@/lib/types";

export default function AiPage() {
  const [enabled, setEnabled] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ enabled: boolean }>("/v1/ai/status").then((r) => setEnabled(r.enabled));
    api<{ shipments: Shipment[] }>("/v1/shipments").then((r) => {
      setShipments(r.shipments);
      const late = r.shipments.find((s) => s.slaOutcome === "LATE") ?? r.shipments[0];
      if (late) setSelected(late.id);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Gemini AI</h1>
        <p className="text-sand-400">
          Optional. Set <code className="text-teal-300">GEMINI_API_KEY</code> in{" "}
          <code className="text-teal-300">.env</code>.
        </p>
      </div>

      <div className="panel p-5">
        <div className="text-sm">
          Status:{" "}
          {enabled ? (
            <span className="text-signal-ok">Enabled</span>
          ) : (
            <span className="text-signal-warn">Disabled (no API key)</span>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-signal-late">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-2xl">Weekly ops brief</h2>
          <button
            className="btn-primary"
            onClick={async () => {
              setError(null);
              try {
                const r = await api<{ brief: string }>("/v1/ai/weekly-brief", {
                  method: "POST",
                  body: "{}",
                });
                setBrief(r.brief);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            Generate brief
          </button>
          {brief && (
            <pre className="whitespace-pre-wrap rounded-lg bg-ink-900 p-3 text-sm text-sand-200">
              {brief}
            </pre>
          )}
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="font-display text-2xl">Delay explainer</h2>
          <select
            className="input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.referenceCode} · {s.slaOutcome}
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={async () => {
              setError(null);
              try {
                const r = await api<{ explanation: string }>(
                  `/v1/ai/explain-delay/${selected}`,
                  { method: "POST", body: "{}" }
                );
                setExplanation(r.explanation);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              }
            }}
          >
            Explain shipment
          </button>
          {explanation && (
            <pre className="whitespace-pre-wrap rounded-lg bg-ink-900 p-3 text-sm text-sand-200">
              {explanation}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
