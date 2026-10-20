import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-950 text-sand-100">
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="pointer-events-none absolute inset-0 bg-grid-fade bg-grid opacity-40" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="font-display text-3xl tracking-tight">
          Lane<span className="text-teal-400">clock</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/login" className="btn-primary">
            Open console
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-24">
        <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.25em] text-teal-400">
          Freight control tower
        </p>
        <h1 className="animate-fade-up-delay mt-4 max-w-3xl font-display text-5xl leading-[1.05] text-sand-100 md:text-7xl">
          Every shipment is a stopwatch.
        </h1>
        <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-lg text-sand-400">
          Clock dwell and transit. Score OTIF against promised ETAs. Manage by exception — with an
          append-only audit trail ops can explain.
        </p>
        <div className="animate-fade-up-delay-2 mt-10 flex flex-wrap gap-4">
          <Link href="/login" className="btn-primary px-6 py-3 text-base">
            Enter demo
          </Link>
          <a href="#product" className="btn-ghost px-6 py-3 text-base">
            See what it measures
          </a>
        </div>

        <div className="animate-fade-up-delay-2 mt-20 overflow-hidden rounded-2xl border border-teal-400/20 bg-ink-900/60 p-6 shadow-[0_0_80px_rgba(45,212,191,0.08)]">
          <div className="mb-4 flex items-center gap-2 font-mono text-xs text-teal-300">
            <span className="clock-pulse h-2 w-2 rounded-full bg-teal-400" />
            LIVE PHASE CLOCK · LC-2026-00005
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              ["Pickup dwell", "6.2h"],
              ["Transit", "14.1h"],
              ["Promised ETA", "3h left"],
              ["SLA", "At risk"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-teal-400/10 bg-ink-800/80 p-4">
                <div className="text-xs text-sand-400">{k}</div>
                <div className="mt-1 font-display text-2xl">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="relative z-10 border-t border-teal-400/10 bg-ink-900/40 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
          {[
            {
              title: "Phase clock",
              body: "Planned vs actual timestamps for every phase. Auto-compute pickup dwell, transit, delivery dwell, and cycle time.",
            },
            {
              title: "Exception inbox",
              body: "Late vs ETA, dwell over threshold, missed phases, holds — ops works the queue, not a flat shipment list.",
            },
            {
              title: "Decision graphs",
              body: "OTIF trends, dwell heatmaps, lane performance, carrier scorecards, and delay Pareto charts.",
            },
          ].map((f) => (
            <div key={f.title}>
              <h2 className="font-display text-2xl text-sand-100">{f.title}</h2>
              <p className="mt-3 text-sand-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-teal-400/10 py-10 text-center text-sm text-sand-400">
        Laneclock portfolio demo · no live carrier GPS · no payments
      </footer>
    </div>
  );
}
