import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink-950 text-sand-100">
      <div className="h-1 bg-corp-band" />
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="font-display text-3xl tracking-tight text-navy-900">
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

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pt-20">
        <div>
          <p className="animate-fade-up font-mono text-xs font-medium uppercase tracking-[0.2em] text-teal-400">
            Freight control tower
          </p>
          <h1 className="animate-fade-up-delay mt-4 font-display text-4xl leading-[1.1] text-navy-900 md:text-5xl lg:text-6xl">
            Every shipment is a stopwatch.
          </h1>
          <p className="animate-fade-up-delay-2 mt-5 max-w-md text-lg text-sand-400">
            Clock dwell and transit. Score OTIF against promised ETAs. Manage by exception, with an
            append-only audit trail ops can explain.
          </p>
          <div className="animate-fade-up-delay-2 mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary px-6 py-3 text-base">
              Enter demo
            </Link>
            <Link href="/register" className="btn-ghost px-6 py-3 text-base">
              Register as client
            </Link>
          </div>
        </div>

        <div className="animate-fade-up-delay-2 panel p-6">
          <div className="mb-4 flex items-center justify-between border-b border-ink-600 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs font-medium text-teal-400">
              <span className="clock-pulse h-2 w-2 rounded-full bg-teal-400" />
              LIVE PHASE CLOCK
            </div>
            <span className="font-mono text-xs text-sand-400">LC-2026-00005</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Pickup dwell", "6.2h"],
              ["Transit", "14.1h"],
              ["Promised ETA", "3h left"],
              ["SLA", "At risk"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-ink-600 bg-ink-700/80 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-sand-400">
                  {k}
                </div>
                <div className="mt-1 font-display text-2xl text-sand-100">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="relative z-10 border-t border-ink-600 bg-ink-800 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
          {[
            {
              title: "Phase clock",
              body: "Planned vs actual timestamps for every phase. Auto-compute pickup dwell, transit, delivery dwell, and cycle time.",
            },
            {
              title: "Exception inbox",
              body: "Late vs ETA, dwell over threshold, missed phases, holds. Ops works the queue, not a flat shipment list.",
            },
            {
              title: "Decision graphs",
              body: "OTIF trends, dwell heatmaps, lane performance, carrier scorecards, and delay Pareto charts.",
            },
          ].map((f) => (
            <div key={f.title} className="border-l-2 border-teal-400 pl-4">
              <h2 className="font-display text-2xl text-navy-900">{f.title}</h2>
              <p className="mt-2 text-sand-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-ink-600 py-8 text-center text-sm text-sand-400">
        Laneclock portfolio demo · no live carrier GPS · no payments
      </footer>
    </div>
  );
}
