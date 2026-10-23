"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatFacility, type Facility } from "@/lib/locations";

type Lane = {
  id: string;
  name: string;
  mode: string;
  expectedTransitHours: number;
  originLocationId: string;
  destinationLocationId: string;
  originLocation?: Facility;
  destinationLocation?: Facility;
};
type Carrier = { id: string; name: string };
type Customer = { id: string; name: string };

export default function NewShipmentPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Facility[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerOrgId: "",
    carrierId: "",
    mode: "FTL",
    originLocationId: "",
    destinationLocationId: "",
    promisedEta: "",
    commodity: "General merchandise",
  });

  useEffect(() => {
    Promise.all([
      api<{ locations: Facility[] }>("/v1/catalog/locations"),
      api<{ lanes: Lane[] }>("/v1/catalog/lanes"),
      api<{ carriers: Carrier[] }>("/v1/catalog/carriers"),
      api<{ customers: Customer[] }>("/v1/catalog/customers"),
    ]).then(([loc, lane, car, cust]) => {
      setLocations(loc.locations);
      setLanes(lane.lanes);
      setCarriers(car.carriers);
      setCustomers(cust.customers);
      const template = lane.lanes[0];
      setForm((f) => ({
        ...f,
        customerOrgId: cust.customers[0]?.id ?? "",
        mode: template?.mode ?? f.mode,
        originLocationId: template?.originLocationId ?? loc.locations[0]?.id ?? "",
        destinationLocationId:
          template?.destinationLocationId ?? loc.locations[1]?.id ?? loc.locations[0]?.id ?? "",
      }));
    });
  }, []);

  const matchedLane = useMemo(() => {
    if (!form.originLocationId || !form.destinationLocationId) return null;
    return (
      lanes.find(
        (l) =>
          l.originLocationId === form.originLocationId &&
          l.destinationLocationId === form.destinationLocationId &&
          l.mode === form.mode
      ) ?? null
    );
  }, [lanes, form.originLocationId, form.destinationLocationId, form.mode]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-4xl">New shipment</h1>
        <p className="text-sand-400">
          Pick facilities. Matching lanes attach automatically for transit and rates.
        </p>
      </div>
      <form
        className="panel space-y-4 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (form.originLocationId === form.destinationLocationId) {
            setError("Origin and destination must differ");
            return;
          }
          setSaving(true);
          try {
            const body = {
              ...form,
              carrierId: form.carrierId || null,
              laneId: matchedLane?.id ?? null,
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
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="Customer">
          <select
            className="input"
            value={form.customerOrgId}
            onChange={(e) => setForm({ ...form, customerOrgId: e.target.value })}
            required
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
        <Field label="Origin facility">
          <select
            className="input"
            value={form.originLocationId}
            onChange={(e) => setForm({ ...form, originLocationId: e.target.value })}
            required
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {formatFacility(l)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Destination facility">
          <select
            className="input"
            value={form.destinationLocationId}
            onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}
            required
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {formatFacility(l)}
              </option>
            ))}
          </select>
        </Field>
        <div className="rounded-md border border-ink-600 bg-ink-900/50 px-3 py-2 text-sm">
          {matchedLane ? (
            <>
              <span className="text-sand-400">Matched lane: </span>
              <span className="text-sand-100">{matchedLane.name}</span>
              <span className="text-sand-400">
                {" "}
                · ~{matchedLane.expectedTransitHours}h expected
              </span>
            </>
          ) : (
            <span className="text-sand-400">
              No lane template for this pair yet. Shipment still books; add a lane under Network if
              this route is recurring.
            </span>
          )}
        </div>
        <Field label="Carrier">
          <select
            className="input"
            value={form.carrierId}
            onChange={(e) => setForm({ ...form, carrierId: e.target.value })}
          >
            <option value="">Unassigned</option>
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
        <button className="btn-primary w-full" disabled={saving}>
          {saving ? "Creating…" : "Create shipment"}
        </button>
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
