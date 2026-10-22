"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const demos = [
  { email: "ops@laneclock.demo", role: "Ops" },
  { email: "client@laneclock.demo", role: "Client" },
  { email: "admin@laneclock.demo", role: "Admin" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("ops@laneclock.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setLoading(false);
      setError(err.message ?? "Sign in failed");
      return;
    }
    window.location.href = "/app";
  }

  return (
    <div className="flex min-h-screen bg-ink-950">
      <div className="hidden w-[42%] flex-col justify-between bg-navy-900 px-10 py-10 text-white md:flex">
        <div className="font-display text-3xl tracking-tight">
          Lane<span className="text-teal-300">clock</span>
        </div>
        <div>
          <h1 className="font-display text-4xl leading-tight">Operations console</h1>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Sign in to manage phase clocks, exceptions, SLA analytics, and audit history.
          </p>
        </div>
        <p className="text-xs text-white/50">Portfolio demo · mock tracking · no payments</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md panel p-8">
          <div className="md:hidden">
            <Link href="/" className="font-display text-3xl text-navy-900">
              Lane<span className="text-teal-400">clock</span>
            </Link>
          </div>
          <h2 className="mt-2 font-display text-2xl text-sand-100 md:mt-0">Sign in</h2>
          <p className="mt-1 text-sm text-sand-400">Access the control tower</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-signal-late">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sand-400">
              Demo accounts
            </p>
            {demos.map((d) => (
              <button
                key={d.email}
                type="button"
                className="flex w-full items-center justify-between rounded-md border border-ink-600 px-3 py-2 text-left text-sm hover:bg-ink-700"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("demo1234");
                }}
              >
                <span className="font-mono text-teal-400">{d.email}</span>
                <span className="text-sand-400">{d.role}</span>
              </button>
            ))}
            <p className="text-xs text-sand-400">Password for all: demo1234</p>
            <p className="pt-2 text-xs text-sand-400">
              New client?{" "}
              <Link href="/register" className="font-medium text-teal-400 hover:underline">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
