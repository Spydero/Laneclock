"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { formatFacility, type Facility } from "@/lib/locations";

type Lane = {
  id: string;
  name: string;
  mode: string;
  expectedTransitHours: number;
  originLocation: Facility;
  destinationLocation: Facility;
};

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

type Tab = "facilities" | "lanes" | "carriers";

const LOCATION_TYPES = ["WAREHOUSE", "HUB", "PORT", "AIRPORT", "CITY"] as const;

export default function NetworkPage() {
  const [tab, setTab] = useState<Tab>("facilities");
  const [locations, setLocations] = useState<Facility[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [locForm, setLocForm] = useState({
    code: "",
    name: "",
    city: "",
    country: "US",
    type: "WAREHOUSE" as (typeof LOCATION_TYPES)[number],
  });
  const [laneForm, setLaneForm] = useState({
    originLocationId: "",
    destinationLocationId: "",
    mode: "FTL",
    expectedTransitHours: "24",
    name: "",
  });

  function load() {
    Promise.all([
      api<{ locations: Facility[] }>("/v1/catalog/locations"),
      api<{ lanes: Lane[] }>("/v1/catalog/lanes"),
      api<{ carriers: Carrier[] }>("/v1/catalog/carriers"),
      api<{ carriers: Score[] }>("/v1/analytics/carriers"),
    ]).then(([loc, lane, car, score]) => {
      setLocations(loc.locations);
      setLanes(lane.lanes);
      setCarriers(car.carriers);
      setScores(score.carriers);
      setLaneForm((f) => ({
        ...f,
        originLocationId: f.originLocationId || loc.locations[0]?.id || "",
        destinationLocationId: f.destinationLocationId || loc.locations[1]?.id || "",
      }));
    });
  }

  useEffect(() => {
    load();
  }, []);

  const scoreMap = Object.fromEntries(scores.map((s) => [s.carrierId, s]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Network</h1>
        <p className="text-sand-400">
          Saved facilities, lane templates, and carriers. New shipments can type any city worldwide;
          booking also adds places here for reuse.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["facilities", "Facilities"],
            ["lanes", "Lanes"],
            ["carriers", "Carriers"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "btn-primary" : "btn-ghost"}
            onClick={() => {
              setTab(id);
              setMsg(null);
              setErr(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {(msg || err) && (
        <p className={`text-sm ${err ? "text-signal-late" : "text-signal-ok"}`}>{err ?? msg}</p>
      )}

      {tab === "facilities" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <form
            className="panel space-y-3 p-5 lg:col-span-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setMsg(null);
              setErr(null);
              try {
                await api("/v1/catalog/locations", {
                  method: "POST",
                  body: JSON.stringify(locForm),
                });
                setMsg(`Added ${locForm.name}`);
                setLocForm({
                  code: "",
                  name: "",
                  city: "",
                  country: "US",
                  type: "WAREHOUSE",
                });
                load();
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Failed");
              }
            }}
          >
            <h2 className="font-display text-2xl text-sand-100">Add facility</h2>
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={locForm.name}
                onChange={(e) => setLocForm({ ...locForm, name: e.target.value })}
                placeholder="Chicago Hub"
                required
              />
            </div>
            <div>
              <label className="label">Code</label>
              <input
                className="input"
                value={locForm.code}
                onChange={(e) => setLocForm({ ...locForm, code: e.target.value })}
                placeholder="CHI-HUB"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={locForm.city}
                  onChange={(e) => setLocForm({ ...locForm, city: e.target.value })}
                  placeholder="Chicago"
                />
              </div>
              <div>
                <label className="label">Country</label>
                <select
                  className="input"
                  value={locForm.country}
                  onChange={(e) => setLocForm({ ...locForm, country: e.target.value })}
                  required
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Type</label>
              <select
                className="input"
                value={locForm.type}
                onChange={(e) =>
                  setLocForm({
                    ...locForm,
                    type: e.target.value as (typeof LOCATION_TYPES)[number],
                  })
                }
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary w-full">Save facility</button>
          </form>
          <div className="panel overflow-x-auto lg:col-span-3">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-teal-400/15 text-xs uppercase text-sand-400">
                <tr>
                  <th className="px-4 py-3">Facility</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.id} className="border-b border-teal-400/10">
                    <td className="px-4 py-3 text-sand-100">{formatFacility(l)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-300">{l.code}</td>
                    <td className="px-4 py-3 text-sand-400">{l.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "lanes" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <form
            className="panel space-y-3 p-5 lg:col-span-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setMsg(null);
              setErr(null);
              try {
                const hours = Number(laneForm.expectedTransitHours);
                if (!Number.isFinite(hours) || hours <= 0) {
                  setErr("Expected transit hours must be positive");
                  return;
                }
                await api("/v1/catalog/lanes", {
                  method: "POST",
                  body: JSON.stringify({
                    originLocationId: laneForm.originLocationId,
                    destinationLocationId: laneForm.destinationLocationId,
                    mode: laneForm.mode,
                    expectedTransitHours: hours,
                    name: laneForm.name || null,
                  }),
                });
                setMsg("Lane template saved");
                setLaneForm((f) => ({ ...f, name: "", expectedTransitHours: "24" }));
                load();
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Failed");
              }
            }}
          >
            <h2 className="font-display text-2xl text-sand-100">Add lane template</h2>
            <div>
              <label className="label">Origin</label>
              <select
                className="input"
                value={laneForm.originLocationId}
                onChange={(e) => setLaneForm({ ...laneForm, originLocationId: e.target.value })}
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {formatFacility(l)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Destination</label>
              <select
                className="input"
                value={laneForm.destinationLocationId}
                onChange={(e) =>
                  setLaneForm({ ...laneForm, destinationLocationId: e.target.value })
                }
                required
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {formatFacility(l)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Mode</label>
                <select
                  className="input"
                  value={laneForm.mode}
                  onChange={(e) => setLaneForm({ ...laneForm, mode: e.target.value })}
                >
                  {["FTL", "LTL", "OCEAN", "AIR", "RAIL"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Transit (hours)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={0.5}
                  value={laneForm.expectedTransitHours}
                  onChange={(e) =>
                    setLaneForm({ ...laneForm, expectedTransitHours: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Display name (optional)</label>
              <input
                className="input"
                value={laneForm.name}
                onChange={(e) => setLaneForm({ ...laneForm, name: e.target.value })}
                placeholder="Auto: Origin → Destination"
              />
            </div>
            <button className="btn-primary w-full">Save lane</button>
          </form>
          <div className="panel overflow-x-auto lg:col-span-3">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-teal-400/15 text-xs uppercase text-sand-400">
                <tr>
                  <th className="px-4 py-3">Lane</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Transit</th>
                </tr>
              </thead>
              <tbody>
                {lanes.map((l) => (
                  <tr key={l.id} className="border-b border-teal-400/10">
                    <td className="px-4 py-3">
                      <div>{l.name}</div>
                      <div className="text-xs text-sand-400">
                        {formatFacility(l.originLocation)} → {formatFacility(l.destinationLocation)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{l.mode}</td>
                    <td className="px-4 py-3 font-mono">{l.expectedTransitHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "carriers" && (
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
      )}
    </div>
  );
}
