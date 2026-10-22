"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-12">
      <div className="w-full max-w-md panel p-8">
        <Link href="/" className="font-display text-3xl text-navy-900">
          Lane<span className="text-teal-400">clock</span>
        </Link>
        <h1 className="mt-4 font-display text-2xl text-sand-100">Client registration</h1>
        <p className="mt-2 text-sm text-sand-400">
          Your company starts <span className="font-semibold text-teal-400">PENDING</span>. An Admin
          must approve before shipments and SLA reports unlock. Ops accounts are created by Admin
          only.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            if (company.trim().length < 2) {
              setLoading(false);
              setError("Company name is required");
              return;
            }

            const { error: err } = await authClient.signUp.email({
              email,
              password,
              name,
            });
            if (err) {
              setLoading(false);
              setError(err.message ?? "Sign up failed");
              return;
            }

            try {
              await api("/v1/onboarding/client", {
                method: "POST",
                body: JSON.stringify({ companyName: company.trim() }),
              });
            } catch (onboardErr) {
              setLoading(false);
              setError(
                onboardErr instanceof Error
                  ? onboardErr.message
                  : "Account created but company setup failed. Contact Admin."
              );
              return;
            }

            window.location.href = "/app";
          }}
        >
          <div>
            <label className="label">Your name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Company</label>
            <input
              className="input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && <p className="text-sm text-signal-late">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating…" : "Create client account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-sand-400">
          Prefer demo?{" "}
          <Link href="/login" className="font-medium text-teal-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
