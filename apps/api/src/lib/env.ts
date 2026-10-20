import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), "../../.env") });
config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "laneclock-dev-secret-change-in-production-32chars",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  API_PORT: Number(process.env.API_PORT ?? 4000),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
