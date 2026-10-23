import type { Location, LocationType, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "./prisma.js";

export type PlaceInput = {
  name?: string | null;
  city: string;
  country: string;
  type?: LocationType | null;
};

type Db = Prisma.TransactionClient | typeof prisma;

function slugPart(value: string, max = 14) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max);
}

function buildCode(country: string, city: string, name: string) {
  const base = `${country}-${slugPart(city)}-${slugPart(name)}`.slice(0, 28);
  const hash = createHash("sha1").update(`${country}|${city}|${name}`).digest("hex").slice(0, 4);
  return `${base}-${hash}`.slice(0, 32);
}

/** Find or create a Location from freeform worldwide place fields. */
export async function resolvePlace(input: PlaceInput, db: Db = prisma): Promise<Location> {
  const country = input.country.trim().toUpperCase();
  const city = input.city.trim();
  const name = (input.name?.trim() || city).slice(0, 120);
  const type = input.type ?? "CITY";

  if (!country || country.length !== 2) {
    throw new Error("Country must be a 2-letter ISO code");
  }
  if (!city) {
    throw new Error("City is required");
  }

  const existing = await db.location.findFirst({
    where: {
      country,
      city: { equals: city, mode: "insensitive" },
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existing) return existing;

  const code = buildCode(country, city, name);
  const clash = await db.location.findUnique({ where: { code } });
  if (clash) return clash;

  return db.location.create({
    data: { code, name, city, country, type },
  });
}

export async function resolveShipmentEndpoints(input: {
  originLocationId?: string | null;
  destinationLocationId?: string | null;
  origin?: PlaceInput | null;
  destination?: PlaceInput | null;
}) {
  let origin: Location | null = null;
  let destination: Location | null = null;

  if (input.originLocationId) {
    origin = await prisma.location.findUnique({ where: { id: input.originLocationId } });
  } else if (input.origin) {
    origin = await resolvePlace(input.origin);
  }

  if (input.destinationLocationId) {
    destination = await prisma.location.findUnique({
      where: { id: input.destinationLocationId },
    });
  } else if (input.destination) {
    destination = await resolvePlace(input.destination);
  }

  if (!origin || !destination) {
    throw new Error("Origin and destination are required");
  }
  if (origin.id === destination.id) {
    throw new Error("Origin and destination must differ");
  }

  return { origin, destination };
}
