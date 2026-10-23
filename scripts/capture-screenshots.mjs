import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.WEB_URL ?? "http://localhost:3000";
const OUT = path.join(ROOT, "docs/screenshots");

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

async function signInCookies() {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE,
    },
    body: JSON.stringify({
      email: "ops@laneclock.demo",
      password: "demo1234",
    }),
  });
  if (!res.ok) {
    throw new Error(`Sign-in failed: ${res.status} ${await res.text()}`);
  }
  const raw = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const cookies = [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    cookies.push({
      name,
      value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    });
  }
  if (!cookies.length) {
    throw new Error("No session cookies returned from sign-in");
  }
  return cookies;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, "01-marketing-home.png");

  const cookies = await signInCookies();
  await context.addCookies(cookies);

  const routes = [
    ["/app", "02-command-tower.png"],
    ["/app/analytics", "03-analytics.png"],
    ["/app/shipments", "04-shipments.png"],
    ["/app/exceptions", "06-exceptions.png"],
    ["/app/audit", "07-audit.png"],
    ["/app/network", "08-network.png"],
    ["/app/shipments/new", "09-new-shipment.png"],
  ];

  for (const [url, file] of routes) {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await shot(page, file);
  }

  await page.goto(`${BASE}/app/shipments`, { waitUntil: "networkidle" });
  await page
    .locator('a[href^="/app/shipments/"]:not([href$="/new"])')
    .first()
    .click();
  await page.waitForURL(/\/app\/shipments\/(?!new)/);
  await page.waitForTimeout(1000);
  await shot(page, "05-shipment-detail.png");

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
