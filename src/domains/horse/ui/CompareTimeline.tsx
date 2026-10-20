/**
 * CompareTimeline.tsx - Last-7-day rating, form and price trend for each
 * horse in the Compare view, read from the saved daily horse snapshots.
 */
import type { Horse } from "@/platform/game/types";
import { useGame } from "@/platform/game/store";
import {
  recentSnapshots,
  windowChange,
  type HorseDailyProgress,
} from "@/domains/horse/application/horseFacade";
import { Sparkline } from "@/shared/ui/charts/Sparkline";
import { cn } from "@/shared/lib/cn";

const DAYS = 7;
const METRICS = [
  { key: "ovr", label: "Rating", money: false },
  { key: "form", label: "Form", money: false },
  { key: "price", label: "Price", money: true },
] as const;

const fmt = (v: number, money: boolean) =>
  money ? `$${Math.round(v).toLocaleString()}` : Number.isInteger(v) ? String(v) : v.toFixed(1);

function Change({ d, money }: { d: number | undefined; money: boolean }) {
  if (d === undefined || Math.abs(d) < 0.05)
    return <span className="text-muted-foreground">—</span>;
  return (
    <span className={d > 0 ? "text-success" : "text-destructive"}>
      {d > 0 ? "+" : "−"}
      {fmt(Math.abs(d), money)}
    </span>
  );
}

const EMPTY: HorseDailyProgress = {};

export function CompareTimeline({ horses }: { horses: Horse[] }) {
  const progress = useGame((s) => s.horseDailyProgress ?? EMPTY);
  const day = useGame((s) => s.day);

  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wide font-mono text-foreground/50 mb-2">
        Last {DAYS} days
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-foreground/50 font-mono uppercase tracking-wide">
              <th className="py-1.5 pr-3 font-normal">Horse</th>
              {METRICS.map((m) => (
                <th key={m.key} className="py-1.5 px-3 font-normal" colSpan={2}>
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horses.map((h) => {
              const snaps = recentSnapshots(progress[h.id], day, DAYS);
              const last = snaps[snaps.length - 1];
              return (
                <tr key={h.id} className="border-t border-border/50">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-foreground/80">{h.name}</div>
                    <div className="text-muted-foreground">
                      {snaps.length === 0
                        ? "No days recorded yet"
                        : `${snaps.length} day${snaps.length === 1 ? "" : "s"} recorded`}
                    </div>
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.key} className="py-2 px-3" colSpan={2}>
                      {last ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 shrink-0">
                            {snaps.length >= 2 ? (
                              <Sparkline
                                data={snaps.map((s) => s[m.key])}
                                variant="line"
                                height={20}
                              />
                            ) : null}
                          </div>
                          <div className={cn("tabular-nums leading-tight")}>
                            <div className="text-foreground/80">{fmt(last[m.key], m.money)}</div>
                            <Change d={windowChange(snaps, m.key)} money={m.money} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Recorded at the end of each day you own the horse.
      </p>
    </div>
  );
}
