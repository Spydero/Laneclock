"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const demos = [
  { email: "ops@laneclock.demo", role: "Ops" },
  { email: "client@laneclock.demo", role: "Client" },
  { email: "admin@laneclock.demo", role: "Admin" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ops@laneclock.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message ?? "Sign in failed");
      return;
    }
    router.replace("/app");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 bg-hero-glow px-4">
      <div className="w-full max-w-md panel p-8">
        <Link href="/" className="font-display text-3xl text-sand-100">
          Lane<span className="text-teal-400">clock</span>
        </Link>
        <p className="mt-2 text-sm text-sand-400">Sign in to the control tower</p>

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
          <p className="text-xs uppercase tracking-wide text-sand-400">Demo accounts</p>
          {demos.map((d) => (
            <button
              key={d.email}
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-teal-400/10 px-3 py-2 text-left text-sm hover:bg-ink-700"
              onClick={() => {
                setEmail(d.email);
                setPassword("demo1234");
              }}
            >
              <span className="font-mono text-teal-300">{d.email}</span>
              <span className="text-sand-400">{d.role}</span>
            </button>
          ))}
          <p className="text-xs text-sand-400">Password for all: demo1234</p>
          <p className="pt-2 text-xs text-sand-400">
            New client?{" "}
            <Link href="/register" className="text-teal-300 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
