import { createHash, randomBytes } from "node:crypto";

export function createTrackingToken(): { raw: string; hash: string; hint: string } {
  const raw = randomBytes(24).toString("base64url");
  const hash = hashToken(raw);
  const hint = raw.slice(0, 6);
  return { raw, hash, hint };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
