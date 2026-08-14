import { useMemo } from "react";
import { AreaTrend, formatCurrencyCompact } from "@/components/charts";
import { weekBucket, type TimeWindowWeeks } from "@/core/analytics/timeWindow";
import type { RegionRunRow } from "@/core/analytics/regionalTrends";

type EntityKind = "jockeys" | "trainers" | "stables";

interface Lookups {
  jockeyNames: Map<string, string>;
  stableNames: Map<string, string>;
  trainerByStable: Map<string, { id: string; name: string }>;
}

interface Props {
  entityId: string;
  kind: EntityKind;
  runsA: RegionRunRow[];
  runsB?: RegionRunRow[];
  lookups: Lookups;
  day: number;
  weeks: TimeWindowWeeks;
  weeksB?: TimeWindowWeeks;
}

function entityKeyForRun(run: RegionRunRow, kind: EntityKind, lookups: Lookups): string | null {
  if (kind === "jockeys") return run.entry.jockeyId ?? null;
  const stableId = run.entry.stableId ?? null;
  if (!stableId) return null;
  if (kind === "stables") return stableId;
  return lookups.trainerByStable.get(stableId)?.id ?? null;
}

export function EntityDetailPanel({
  entityId,
  kind,
  runsA,
  runsB,
  lookups,
  day,
  weeks,
  weeksB,
}: Props) {
  const entityRunsA = useMemo(
    () => runsA.filter((r) => entityKeyForRun(r, kind, lookups) === entityId),
    [runsA, entityId, kind, lookups],
  );
  const entityRunsB = useMemo(
    () => (runsB ? runsB.filter((r) => entityKeyForRun(r, kind, lookups) === entityId) : []),
    [runsB, entityId, kind, lookups],
  );

  const summary = useMemo(() => {
    const starts = entityRunsA.length;
    const wins = entityRunsA.filter((r) => r.entry.position === 1).length;
    const top3 = entityRunsA.filter((r) => r.entry.position <= 3).length;
    const earnings = entityRunsA.reduce((s, r) => s + (r.entry.purseEarned ?? 0), 0);
    return { starts, wins, top3, earnings };
  }, [entityRunsA]);

  const weeklyEarnings = useMemo(() => {
    const buckets = weeks || 1;
    const grouped: number[] = new Array(buckets).fill(0);
    for (const run of entityRunsA) {
      const b = weeks ? weekBucket(run.entry.day, day, weeks) : 0;
      if (b >= 0) grouped[b]! += run.entry.purseEarned ?? 0;
    }
    return grouped.map((y, i) => ({ x: `W-${buckets - i - 1}`, y }));
  }, [entityRunsA, day, weeks]);

  if (entityRunsA.length === 0 && entityRunsB.length === 0) {
    return (
      <p className="py-3 text-center text-[11px] font-mono uppercase tracking-wider text-cream/40">
        No runs for this entity in the selected window.
      </p>
    );
  }

  return (
    <div className="mt-1 space-y-2 border-t border-white/5 pt-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-cream/60">
        <span>
          {summary.starts} starts · {summary.wins} wins · {summary.top3} top-3 ·{" "}
          {formatCurrencyCompact(summary.earnings)}
        </span>
      </div>

      {weeklyEarnings.length > 1 && (
        <div className="h-16">
          <AreaTrend data={weeklyEarnings} height={56} yFormat={formatCurrencyCompact} />
        </div>
      )}

      <ul className="max-h-40 space-y-0.5 overflow-y-auto">
        {entityRunsA.map((r, i) => (
          <li
            key={`a-${r.entry.raceId}-${r.horseId}-${i}`}
            className="flex items-center justify-between gap-2 rounded bg-white/[0.02] px-1.5 py-1 text-[10px]"
          >
            <span className="truncate text-cream/70">
              {r.entry.raceName}
              <span className="ml-1.5 font-mono text-cream/35">D{r.entry.day}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-cream/50">
              {r.horseName} · {r.entry.position}
              {r.isG1 ? " · G1" : ""}
            </span>
          </li>
        ))}
        {entityRunsB.map((r, i) => (
          <li
            key={`b-${r.entry.raceId}-${r.horseId}-${i}`}
            className="flex items-center justify-between gap-2 rounded bg-white/[0.02] px-1.5 py-1 text-[10px]"
          >
            <span className="truncate text-cream/70">
              <span className="mr-1 rounded bg-[var(--chart-2)]/20 px-1 text-[var(--chart-2)]">
                B
              </span>
              {r.entry.raceName}
              <span className="ml-1.5 font-mono text-cream/35">D{r.entry.day}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-cream/50">
              {r.horseName} · {r.entry.position}
              {r.isG1 ? " · G1" : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
