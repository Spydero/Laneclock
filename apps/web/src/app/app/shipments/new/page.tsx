"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { formatFacility, type Facility } from "@/lib/locations";

type Carrier = { id: string; name: string };
type Customer = { id: string; name: string };

type PlaceForm = {
  name: string;
  city: string;
  country: string;
  type: string;
};

const emptyPlace = (country = "US"): PlaceForm => ({
  name: "",
  city: "",
  country,
  type: "CITY",
});

const SITE_TYPES = ["CITY", "WAREHOUSE", "HUB", "PORT", "AIRPORT"] as const;

export default function NewShipmentPage() {
  const router = useRouter();
  const [saved, setSaved] = useState<Facility[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customerOrgId: "",
    carrierId: "",
    mode: "FTL",
    promisedEta: "",
    commodity: "General merchandise",
  });
  const [origin, setOrigin] = useState<PlaceForm>(emptyPlace("US"));
  const [destination, setDestination] = useState<PlaceForm>(emptyPlace("DE"));

  useEffect(() => {
    Promise.all([
      api<{ locations: Facility[] }>("/v1/catalog/locations"),
      api<{ carriers: Carrier[] }>("/v1/catalog/carriers"),
      api<{ customers: Customer[] }>("/v1/catalog/customers"),
    ]).then(([loc, car, cust]) => {
      setSaved(loc.locations);
      setCarriers(car.carriers);
      setCustomers(cust.customers);
      setForm((f) => ({
        ...f,
        customerOrgId: cust.customers[0]?.id ?? "",
      }));
    });
  }, []);

  function applySaved(side: "origin" | "destination", id: string) {
    const loc = saved.find((l) => l.id === id);
    if (!loc) return;
    const place: PlaceForm = {
      name: loc.name,
      city: loc.city ?? loc.name,
      country: loc.country,
      type: loc.type ?? "CITY",
    };
    if (side === "origin") setOrigin(place);
    else setDestination(place);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-sand-100">New shipment</h1>
        <p className="text-sand-400">
          Type a city (local worldwide suggestions, no external API) or enter any name. Country list
          covers all ISO countries. Places save to Network when you book.
        </p>
      </div>
      <form
        className="panel space-y-5 p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (!origin.city.trim() || !destination.city.trim()) {
            setError("City is required for origin and destination");
            return;
          }
          const same =
            origin.city.trim().toLowerCase() === destination.city.trim().toLowerCase() &&
            origin.country === destination.country &&
            (origin.name.trim() || origin.city).toLowerCase() ===
              (destination.name.trim() || destination.city).toLowerCase();
          if (same) {
            setError("Origin and destination must differ");
            return;
          }
          setSaving(true);
          try {
            const body = {
              customerOrgId: form.customerOrgId,
              carrierId: form.carrierId || null,
              mode: form.mode,
              commodity: form.commodity,
              promisedEta: form.promisedEta
                ? new Date(form.promisedEta).toISOString()
                : null,
              promisedEtd: new Date().toISOString(),
              origin: {
                name: origin.name.trim() || null,
                city: origin.city.trim(),
                country: origin.country,
                type: origin.type,
              },
              destination: {
                name: destination.name.trim() || null,
                city: destination.city.trim(),
                country: destination.country,
                type: destination.type,
              },
            };
            const r = await api<{ shipment: { id: string } }>("/v1/shipments", {
              method: "POST",
              body: JSON.stringify(body),
            });
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

        <PlaceBlock
          title="Origin"
          place={origin}
          onChange={setOrigin}
          saved={saved}
          onPickSaved={(id) => applySaved("origin", id)}
        />
        <PlaceBlock
          title="Destination"
          place={destination}
          onChange={setDestination}
          saved={saved}
          onPickSaved={(id) => applySaved("destination", id)}
        />

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

function PlaceBlock({
  title,
  place,
  onChange,
  saved,
  onPickSaved,
}: {
  title: string;
  place: PlaceForm;
  onChange: (p: PlaceForm) => void;
  saved: Facility[];
  onPickSaved: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-md border border-ink-600 p-4">
      <legend className="px-1 font-display text-xl text-sand-100">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="City">
          <CityAutocomplete
            value={place.city}
            country={place.country}
            required
            onChange={({ city, country }) =>
              onChange({
                ...place,
                city,
                ...(country ? { country } : {}),
              })
            }
          />
        </Field>
        <Field label="Country">
          <select
            className="input"
            value={place.country}
            onChange={(e) => onChange({ ...place, country: e.target.value })}
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Site name (optional)">
          <input
            className="input"
            value={place.name}
            onChange={(e) => onChange({ ...place, name: e.target.value })}
            placeholder="Port terminal, DC name…"
          />
        </Field>
        <Field label="Site type">
          <select
            className="input"
            value={place.type}
            onChange={(e) => onChange({ ...place, type: e.target.value })}
          >
            {SITE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      {saved.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-sand-400 hover:text-sand-200">
            Reuse a place already on this account
          </summary>
          <select
            className="input mt-2"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onPickSaved(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Select saved facility…</option>
            {saved.map((l) => (
              <option key={l.id} value={l.id}>
                {formatFacility(l)}
              </option>
            ))}
          </select>
        </details>
      )}
    </fieldset>
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
