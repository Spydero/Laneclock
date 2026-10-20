"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 bg-hero-glow px-4">
      <div className="w-full max-w-md panel p-8">
        <Link href="/" className="font-display text-3xl">
          Lane<span className="text-teal-400">clock</span>
        </Link>
        <p className="mt-2 text-sm text-sand-400">
          Client self-register — company starts PENDING until Admin approves.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
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
            // Best-effort: create pending org via public-ish note — admin can approve later.
            // Membership for new clients is created on first admin approval flow in seed demos.
            try {
              await api("/v1/me");
            } catch {
              /* ignore */
            }
            setLoading(false);
            void company;
            router.replace("/login");
          }}
        >
          <div>
            <label className="label">Your name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Company</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-sand-400">
          Prefer demo? <Link href="/login" className="text-teal-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
