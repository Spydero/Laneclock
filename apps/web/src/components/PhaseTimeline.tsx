import { fmtDate, fmtHours } from "@/lib/format";
import type { Phase } from "@/lib/types";
import clsx from "clsx";

export function PhaseTimeline({ phases }: { phases: Phase[] }) {
  return (
    <ol className="space-y-0">
      {phases.map((p, i) => {
        const done = Boolean(p.actualStartAt);
        return (
          <li key={p.phase} className="relative flex gap-4 pb-6 last:pb-0">
            {i < phases.length - 1 && (
              <span
                className={clsx(
                  "absolute left-[7px] top-4 h-full w-px",
                  done ? "bg-teal-400/50" : "bg-teal-400/15"
                )}
              />
            )}
            <span
              className={clsx(
                "relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2",
                done ? "border-teal-400 bg-teal-400" : "border-teal-400/30 bg-ink-900"
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium text-sand-100">{p.phase.replaceAll("_", " ")}</span>
                {p.actualStartAt ? (
                  <span className="font-mono text-xs text-teal-400">{fmtDate(p.actualStartAt)}</span>
                ) : (
                  <span className="text-xs text-sand-400">Pending</span>
                )}
              </div>
              {p.plannedStartAt && (
                <div className="text-xs text-sand-400">
                  Planned {fmtDate(p.plannedStartAt)}
                  {p.plannedEndAt ? ` → ${fmtDate(p.plannedEndAt)}` : ""}
                </div>
              )}
              {p.actualStartAt && p.actualEndAt && (
                <div className="text-xs text-sand-200">
                  Duration{" "}
                  {fmtHours(
                    (new Date(p.actualEndAt).getTime() - new Date(p.actualStartAt).getTime()) /
                      3600_000
                  )}
                </div>
              )}
              {p.notes ? <p className="mt-1 text-sm text-sand-400">{p.notes}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
