"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Loc = { id: string; code: string; name: string };
type Lane = { id: string; name: string; originLocationId: string; destinationLocationId: string; mode: string };
type Carrier = { id: string; name: string };
type Customer = { id: string; name: string };

export default function NewShipmentPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Loc[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerOrgId: "",
    carrierId: "",
    laneId: "",
    mode: "FTL",
    originLocationId: "",
    destinationLocationId: "",
    promisedEta: "",
    commodity: "General merchandise",
  });

  useEffect(() => {
    Promise.all([
      api<{ locations: Loc[] }>("/v1/catalog/locations"),
      api<{ lanes: Lane[] }>("/v1/catalog/lanes"),
      api<{ carriers: Carrier[] }>("/v1/catalog/carriers"),
      api<{ customers: Customer[] }>("/v1/catalog/customers"),
    ]).then(([loc, lane, car, cust]) => {
      setLocations(loc.locations);
      setLanes(lane.lanes);
      setCarriers(car.carriers);
      setCustomers(cust.customers);
      if (cust.customers[0]) {
        setForm((f) => ({ ...f, customerOrgId: cust.customers[0].id }));
      }
      if (loc.locations[0] && loc.locations[1]) {
        setForm((f) => ({
          ...f,
          originLocationId: loc.locations[0].id,
          destinationLocationId: loc.locations[1].id,
        }));
      }
    });
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-4xl">New shipment</h1>
      <form
        className="panel space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            const body = {
              ...form,
              carrierId: form.carrierId || null,
              laneId: form.laneId || null,
              promisedEta: form.promisedEta
                ? new Date(form.promisedEta).toISOString()
                : null,
              promisedEtd: new Date().toISOString(),
            };
            const r = await api<{ shipment: { id: string }; trackingToken: string }>(
              "/v1/shipments",
              { method: "POST", body: JSON.stringify(body) }
            );
            router.push(`/app/shipments/${r.shipment.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
          }
        }}
      >
        <Field label="Customer">
          <select
            className="input"
            value={form.customerOrgId}
            onChange={(e) => setForm({ ...form, customerOrgId: e.target.value })}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mode">
          <select
            className="input"
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value })}
          >
            {["FTL", "LTL", "OCEAN", "AIR", "RAIL"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Lane (optional)">
          <select
            className="input"
            value={form.laneId}
            onChange={(e) => {
              const lane = lanes.find((l) => l.id === e.target.value);
              setForm({
                ...form,
                laneId: e.target.value,
                ...(lane
                  ? {
                      originLocationId: lane.originLocationId,
                      destinationLocationId: lane.destinationLocationId,
                      mode: lane.mode,
                    }
                  : {}),
              });
            }}
          >
            <option value="">-</option>
            {lanes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Origin">
          <select
            className="input"
            value={form.originLocationId}
            onChange={(e) => setForm({ ...form, originLocationId: e.target.value })}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} - {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Destination">
          <select
            className="input"
            value={form.destinationLocationId}
            onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code} - {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Carrier">
          <select
            className="input"
            value={form.carrierId}
            onChange={(e) => setForm({ ...form, carrierId: e.target.value })}
          >
            <option value="">-</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Promised ETA">
          <input
            className="input"
            type="datetime-local"
            value={form.promisedEta}
            onChange={(e) => setForm({ ...form, promisedEta: e.target.value })}
          />
        </Field>
        <Field label="Commodity">
          <input
            className="input"
            value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value })}
          />
        </Field>
        {error && <p className="text-sm text-signal-late">{error}</p>}
        <button className="btn-primary w-full">Create shipment</button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
