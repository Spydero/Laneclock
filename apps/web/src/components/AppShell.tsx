"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { MeResponse } from "@/lib/types";
import clsx from "clsx";

const opsLinks = [
  { href: "/app", label: "Command" },
  { href: "/app/shipments", label: "Shipments" },
  { href: "/app/exceptions", label: "Exceptions" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/network", label: "Network" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/audit", label: "Audit" },
  { href: "/app/notifications", label: "Alerts" },
  { href: "/app/ai", label: "AI" },
  { href: "/app/settings", label: "Settings" },
];

const clientLinks = [
  { href: "/app", label: "Overview" },
  { href: "/app/shipments", label: "Shipments" },
  { href: "/app/analytics", label: "SLA Report" },
  { href: "/app/notifications", label: "Alerts" },
  { href: "/app/settings", label: "Settings" },
];

const adminExtra = [{ href: "/app/admin", label: "Admin" }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{
    shipments: { id: string; referenceCode: string }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled && !me) {
        setBootError("Still loading. Check that the API is running on :4000");
      }
    }, 8000);

    api<MeResponse>("/v1/me")
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        setBootError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setBootError(
          err instanceof Error
            ? err.message
            : "Could not reach the API. Start it with: pnpm dev:api"
        );
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const t = setTimeout(() => {
      api<{ shipments: { id: string; referenceCode: string }[] }>(
        `/v1/search?q=${encodeURIComponent(search)}`
      )
        .then((r) => setSearchResults(r))
        .catch(() => setSearchResults(null));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center text-sand-400">
        <p className="font-medium text-sand-100">
          {bootError ? "Console failed to load" : "Loading console…"}
        </p>
        {bootError && (
          <>
            <p className="max-w-md text-sm text-signal-late">{bootError}</p>
            <div className="flex gap-2">
              <Link href="/login" className="btn-primary">
                Go to login
              </Link>
              <button className="btn-ghost" onClick={() => window.location.reload()}>
                Retry
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const role = me.membership?.role ?? "CLIENT";
  const pending =
    role === "CLIENT" && me.membership?.organization.approvalStatus === "PENDING";
  const rejected =
    role === "CLIENT" && me.membership?.organization.approvalStatus === "REJECTED";
  const links =
    role === "CLIENT"
      ? pending || rejected
        ? clientLinks.filter((l) => l.href === "/app" || l.href === "/app/settings")
        : clientLinks
      : role === "ADMIN"
        ? [...opsLinks, ...adminExtra]
        : opsLinks;

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="h-1 bg-corp-band" />
      {(pending || rejected) && (
        <div
          className={`border-b px-4 py-2 text-center text-sm ${
            rejected
              ? "border-signal-late/30 bg-signal-late/10 text-signal-late"
              : "border-signal-warn/30 bg-signal-warn/10 text-signal-warn"
          }`}
        >
          {rejected
            ? "Your company was rejected. Contact Laneclock Admin."
            : "Your company is pending Admin approval. Shipments and SLA reports unlock after approval."}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-ink-600 bg-ink-800/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <Link href="/app" className="font-display text-2xl tracking-tight text-navy-900">
            Lane<span className="text-teal-400">clock</span>
          </Link>

          <button
            type="button"
            className="btn-ghost ml-1 px-2 py-1 text-xs lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
          >
            Menu
          </button>

          <nav className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium transition",
                  pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                    ? "bg-teal-400/10 text-teal-500"
                    : "text-sand-400 hover:bg-ink-700 hover:text-sand-100"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="relative ml-auto w-36 sm:w-56">
            <input
              className="input py-1.5"
              placeholder="Search shipments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchResults && searchResults.shipments.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-ink-600 bg-ink-800 shadow-sm">
                {searchResults.shipments.map((s) => (
                  <Link
                    key={s.id}
                    href={`/app/shipments/${s.id}`}
                    className="block px-3 py-2 text-sm hover:bg-ink-700"
                    onClick={() => {
                      setSearch("");
                      setSearchResults(null);
                    }}
                  >
                    {s.referenceCode}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="hidden border-l border-ink-600 pl-3 text-right text-xs md:block">
            <div className="font-medium text-sand-100">{me.user.name}</div>
            <div className="text-sand-400">
              {role} · {me.membership?.organization.name}
            </div>
          </div>
          <button
            className="btn-ghost py-1.5 text-xs"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/login";
            }}
          >
            Sign out
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-ink-600 px-4 py-3 lg:hidden">
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className={clsx(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium",
                    pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                      ? "bg-teal-400/10 text-teal-500"
                      : "bg-ink-700 text-sand-200"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
