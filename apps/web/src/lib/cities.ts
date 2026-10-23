import citiesData from "@/data/major-cities.json";
import { countryName } from "@/lib/countries";

export type CityRow = { n: string; c: string };

const CITIES = citiesData as CityRow[];

export type CitySuggestion = {
  city: string;
  country: string;
  label: string;
};

/** Local autocomplete over bundled major cities (~10k worldwide). */
export function searchCities(query: string, limit = 12): CitySuggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const starts: CitySuggestion[] = [];
  const contains: CitySuggestion[] = [];

  for (const row of CITIES) {
    const name = row.n.toLowerCase();
    if (!name.includes(q)) continue;
    const item: CitySuggestion = {
      city: row.n,
      country: row.c,
      label: `${row.n}, ${countryName(row.c)} (${row.c})`,
    };
    if (name.startsWith(q)) starts.push(item);
    else contains.push(item);
    if (starts.length >= limit) break;
  }

  return [...starts, ...contains].slice(0, limit);
}
