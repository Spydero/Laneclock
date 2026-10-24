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
    <div className="panel relative overflow-hidden p-4 pl-5">
      <div className="absolute inset-y-0 left-0 w-0.5 bg-teal-400/70" aria-hidden />
      <div className="text-[11px] font-semibold uppercase tracking-wider text-sand-400">
        {label}
      </div>
      <div className="mt-1 font-display text-3xl tracking-tight text-sand-100">{value}</div>
      {hint ? <div className="mt-1 text-xs font-medium text-teal-400">{hint}</div> : null}
    </div>
  );
}
