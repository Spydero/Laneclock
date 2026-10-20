"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { MeResponse } from "@/lib/types";
import clsx from "clsx";

const opsLinks = [
  { href: "/app", label: "Command" },
  { href: "/app/shipments", label: "Shipments" },
  { href: "/app/exceptions", label: "Exceptions" },
  { href: "/app/analytics", label: "Analytics" },
  { href: "/app/carriers", label: "Carriers" },
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
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{
    shipments: { id: string; referenceCode: string }[];
  } | null>(null);

  useEffect(() => {
    api<MeResponse>("/v1/me")
      .then(setMe)
      .catch(() => router.replace("/login"));
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
      <div className="flex min-h-screen items-center justify-center text-sand-400">
        Loading console…
      </div>
    );
  }

  const role = me.membership?.role ?? "CLIENT";
  const links =
    role === "CLIENT"
      ? clientLinks
      : role === "ADMIN"
        ? [...opsLinks, ...adminExtra]
        : opsLinks;

  return (
    <div className="min-h-screen bg-ink-950 bg-hero-glow">
      <header className="sticky top-0 z-40 border-b border-teal-400/10 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3">
          <Link href="/app" className="font-display text-2xl tracking-tight text-sand-100">
            Lane<span className="text-teal-400">clock</span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  "rounded-md px-2.5 py-1.5 text-sm transition",
                  pathname === l.href || (l.href !== "/app" && pathname.startsWith(l.href))
                    ? "bg-teal-500/15 text-teal-300"
                    : "text-sand-400 hover:text-sand-100"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="relative ml-auto w-48 sm:w-64">
            <input
              className="input py-1.5"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {searchResults && searchResults.shipments.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-teal-400/20 bg-ink-800 shadow-xl">
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
          <div className="hidden text-right text-xs sm:block">
            <div className="text-sand-100">{me.user.name}</div>
            <div className="text-sand-400">
              {role} · {me.membership?.organization.name}
            </div>
          </div>
          <button
            className="btn-ghost py-1.5 text-xs"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6">{children}</main>
    </div>
  );
}
