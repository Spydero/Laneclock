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
      <div className="text-[11px] font-semibold uppercase tracking-wider text-sand-400">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl text-sand-100">{value}</div>
      {hint ? <div className="mt-1 text-xs font-medium text-teal-400">{hint}</div> : null}
    </div>
  );
}
