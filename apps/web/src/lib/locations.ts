export type Facility = {
  id: string;
  code: string;
  name: string;
  city?: string | null;
  country: string;
  type?: string;
};

/** Human label for facility pickers and tables. */
export function formatFacility(loc: Facility | null | undefined) {
  if (!loc) return "-";
  const place = [loc.city, loc.country].filter(Boolean).join(", ");
  return place ? `${loc.name} · ${place}` : loc.name;
}

export function formatLaneName(
  origin: Facility | null | undefined,
  destination: Facility | null | undefined
) {
  return `${formatFacility(origin).split(" · ")[0]} → ${formatFacility(destination).split(" · ")[0]}`;
}
