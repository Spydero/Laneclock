import countriesData from "@/data/countries.json";

export type Country = { code: string; name: string };

/** Full ISO country list (bundled, no external API). */
export const COUNTRIES: Country[] = countriesData as Country[];

export function countryName(code: string) {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}
