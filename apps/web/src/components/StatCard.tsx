export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="text-xs uppercase tracking-wide text-sand-400">{label}</div>
      <div className="mt-1 font-display text-3xl text-sand-100">{value}</div>
      {hint ? <div className="mt-1 text-xs text-teal-300/80">{hint}</div> : null}
    </div>
  );
}
