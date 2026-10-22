export function fmtHours(h: number | null | undefined) {
  if (h == null || Number.isNaN(h)) return "-";
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function slaColor(outcome: string) {
  switch (outcome) {
    case "EARLY":
    case "ON_TIME":
      return "bg-signal-ok/20 text-signal-ok";
    case "LATE":
      return "bg-signal-late/20 text-signal-late";
    default:
      return "bg-sand-400/10 text-sand-400";
  }
}

export function statusColor(status: string) {
  if (status === "DELIVERED") return "bg-signal-ok/15 text-signal-ok";
  if (status === "ON_HOLD" || status === "CANCELLED") return "bg-signal-late/15 text-signal-late";
  if (status === "IN_TRANSIT" || status === "AT_DELIVERY") return "bg-teal-400/10 text-teal-500";
  return "bg-ink-900 text-sand-400";
}
