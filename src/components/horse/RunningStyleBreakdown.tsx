/**
 * RunningStyleBreakdown — Horse profile section that contrasts a horse's
 * declared (genetic) running style with its observed pace tendency, broken
 * down by trip and surface. Supports a compare mode where a second horse from
 * the player's stable can be set side-by-side.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Gauge, GitCompare, X } from "lucide-react";
import type { Horse, RunningStyle } from "@/game/types";
import { useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import { derivePaceStyleLabel } from "@/core/race/sectionalAnalysis";
import {
  classifyTendency,
  classifyDistanceBucket as distanceBucket,
  getHorseTendencyStats,
  TENDENCY_LABEL,
  type DistanceBucket,
  type SurfaceFilter,
  type Tendency,
} from "@/core/horse/paceTendency";
import { cn } from "@/lib/cn";

interface RunningStyleBreakdownProps {
  horse: Horse;
}

const STYLE_META: Record<RunningStyle, { label: string; blurb: string }> = {
  E: { label: "Early Speed", blurb: "Breaks alertly and looks to make the lead from the gate." },
  EP: {
    label: "Early / Presser",
    blurb: "Shows speed but is content tracking just off the leaders.",
  },
  P: { label: "Presser", blurb: "Settles mid-pack, then ranges up turning for home." },
  S: { label: "Stalker / Closer", blurb: "Drops out early and finishes hard from off the pace." },
};

const TENDENCY_ORDER: Tendency[] = ["front", "mid", "off"];
const BUCKETS: DistanceBucket[] = ["sprint", "mile", "route"];
const BUCKET_LABEL: Record<DistanceBucket, string> = {
  sprint: "Sprint",
  mile: "Mile",
  route: "Route",
  any: "Any",
};
const SURFACES: SurfaceFilter[] = ["any", "Turf", "Dirt", "Synthetic"];

export function RunningStyleBreakdown({ horse }: RunningStyleBreakdownProps) {
  const allHorses = useGameWithShallow((s: GameState) => Object.values(s.horses ?? {})) as Horse[];
  const [compareId, setCompareId] = useState<string | null>(null);
  const [surface, setSurface] = useState<SurfaceFilter>("any");

  const horseMap = useMemo(() => {
    const map = new Map<string, Horse>();
    for (let i = 0; i < allHorses.length; i++) {
      map.set(allHorses[i].id, allHorses[i]);
    }
    return map;
  }, [allHorses]);

  const compareHorse = useMemo(
    () => (compareId ? (horseMap.get(compareId) ?? null) : null),
    [horseMap, compareId],
  );

  const compareOptions = useMemo(
    () =>
      allHorses
        .filter((h) => h.owned && h.id !== horse.id && (h.raceHistory?.length ?? 0) > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allHorses, horse.id],
  );

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-gold" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
            Running Style Breakdown
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={surface} onValueChange={(v) => setSurface(v as SurfaceFilter)}>
            <SelectTrigger className="h-7 w-[120px] text-[10px] font-mono uppercase border-white/10 bg-black/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SURFACES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "any" ? "Any Surface" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {compareHorse ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCompareId(null)}
              className="h-7 px-2 text-[10px] font-black uppercase tracking-widest text-cream/50 hover:text-gold"
            >
              <X className="h-3 w-3 mr-1" /> Exit Compare
            </Button>
          ) : (
            <Select onValueChange={(v) => setCompareId(v)}>
              <SelectTrigger className="h-7 w-[180px] text-[10px] font-mono uppercase border-gold/30 bg-black/20 text-gold-muted">
                <GitCompare className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Compare with…" />
              </SelectTrigger>
              <SelectContent>
                {compareOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-[10px] text-cream/40 uppercase">
                    No other horses with race data.
                  </div>
                ) : (
                  compareOptions.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className={cn("grid gap-4", compareHorse ? "lg:grid-cols-2" : "grid-cols-1")}>
        <HorsePaceCard horse={horse} surface={surface} accent="gold" />
        {compareHorse && <HorsePaceCard horse={compareHorse} surface={surface} accent="info" />}
      </div>
    </section>
  );
}

interface HorsePaceCardProps {
  horse: Horse;
  surface: SurfaceFilter;
  accent: "gold" | "info";
}

function HorsePaceCard({ horse, surface, accent }: HorsePaceCardProps) {
  const declared = (horse.runningStyle ?? "P") as RunningStyle;
  const declaredMeta = STYLE_META[declared] ?? STYLE_META.P;

  const racesAll = (horse.raceHistory ?? []).filter(
    (r) => r.pacePositions && r.pacePositions.length > 0,
  );
  const races = surface === "any" ? racesAll : racesAll.filter((r) => r.surface === surface);

  // Avg position per call segment
  const maxQuarters = races.reduce((m, r) => Math.max(m, r.pacePositions?.length ?? 0), 0);
  const avgPositions: number[] = [];
  for (let q = 0; q < maxQuarters; q++) {
    const ps = races
      .map((r) => r.pacePositions?.[q])
      .filter((p): p is number => typeof p === "number");
    if (ps.length) avgPositions.push(ps.reduce((a, b) => a + b, 0) / ps.length);
  }
  const observed = avgPositions.length ? derivePaceStyleLabel(avgPositions) : null;

  // Overall stats
  const overall = getHorseTendencyStats(horse, { surface });

  // Drilldown by trip bucket
  const buckets = BUCKETS.map((b) => ({
    bucket: b,
    stats: getHorseTendencyStats(horse, { distance: b, surface }),
  }));

  const accentLine = accent === "gold" ? "border-l-gold" : "border-l-info";
  const accentText = accent === "gold" ? "text-gold" : "text-info";
  const accentBright = accent === "gold" ? "text-gold-bright" : "text-info";
  const accentBar = accent === "gold" ? "bg-gold-bright/80" : "bg-info/80";
  const accentBarSoft = accent === "gold" ? "bg-gold/30" : "bg-info/30";

  return (
    <Card
      className={cn("bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4", accentLine)}
    >
      <CardContent className="p-5 space-y-5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[10px] font-black uppercase text-cream/30 tracking-widest">
            {horse.name}
          </div>
          <div className="text-[9px] font-mono uppercase text-cream/30 tabular-nums">
            {races.length} race{races.length === 1 ? "" : "s"} ·{" "}
            {surface === "any" ? "all surfaces" : surface}
          </div>
        </div>

        {/* Declared vs observed */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 border border-white/5 p-3">
            <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
              Declared
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("font-mono text-xl font-black", accentText)}>{declared}</span>
              <span className="text-[10px] font-bold text-cream/80 uppercase tracking-wide">
                {declaredMeta.label}
              </span>
            </div>
            <p className="text-[10px] text-cream/40 mt-1 leading-snug">{declaredMeta.blurb}</p>
          </div>
          <div className="bg-black/30 border border-white/5 p-3">
            <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
              Observed
            </div>
            {observed ? (
              <div className={cn("text-xs font-black uppercase tracking-tight", accentBright)}>
                {observed}
              </div>
            ) : (
              <div className="text-[10px] font-mono text-cream/30 italic uppercase">
                No pace data
              </div>
            )}
            {overall.dominant && (
              <p className="text-[10px] text-cream/40 mt-1 leading-snug">
                Dominant tendency: {TENDENCY_LABEL[overall.dominant]} (
                {(overall.dominantShare * 100).toFixed(0)}%)
              </p>
            )}
          </div>
        </div>

        {/* Overall tendency bars */}
        {overall.sample > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-black uppercase text-cream/30 tracking-widest">
              First-Call Tendency · Win Rate by Position
            </div>
            {TENDENCY_ORDER.map((t) => {
              const runs = overall.counts[t];
              const wins = overall.wins[t];
              const sharePct = overall.sample ? (runs / overall.sample) * 100 : 0;
              const winPct = runs ? (wins / runs) * 100 : 0;
              return (
                <div key={t} className="flex items-center gap-2">
                  <div className="w-16 text-[10px] font-bold uppercase tracking-wider text-cream/60">
                    {TENDENCY_LABEL[t].split("-")[0]}
                  </div>
                  <div className="flex-1 h-5 bg-black/40 border border-white/5 relative overflow-hidden">
                    <div
                      className={cn("absolute inset-y-0 left-0", accentBarSoft)}
                      style={{ width: `${sharePct}%` }}
                    />
                    <div
                      className={cn("absolute inset-y-0 left-0", accentBar)}
                      style={{ width: `${sharePct * (winPct / 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-mono text-cream/80 tabular-nums">
                      <span>
                        {runs} · {sharePct.toFixed(0)}%
                      </span>
                      <span className={winPct > 0 ? accentBright : "text-cream/30"}>
                        {wins}W · {winPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Trip drilldown */}
        <div className="space-y-2 pt-3 border-t border-white/5">
          <div className="text-[10px] font-black uppercase text-cream/30 tracking-widest">
            By Trip · Sample Size & Tendency
          </div>
          <div className="overflow-hidden border border-white/5">
            <table className="w-full text-[10px] font-mono">
              <thead className="bg-black/40 text-cream/30 uppercase tracking-widest">
                <tr>
                  <th className="text-left px-2 py-1.5 font-black">Trip</th>
                  <th className="text-center px-2 py-1.5 font-black">N</th>
                  <th className="text-center px-2 py-1.5 font-black">Front</th>
                  <th className="text-center px-2 py-1.5 font-black">Mid</th>
                  <th className="text-center px-2 py-1.5 font-black">Off</th>
                  <th className="text-right px-2 py-1.5 font-black">W · ITM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {buckets.map(({ bucket, stats }) => {
                  const totalWins = stats.wins.front + stats.wins.mid + stats.wins.off;
                  const totalItm = stats.itm.front + stats.itm.mid + stats.itm.off;
                  const dominant = stats.dominant;
                  return (
                    <tr key={bucket} className={stats.sample === 0 ? "opacity-40" : ""}>
                      <td className="px-2 py-1.5 text-cream/80 uppercase">
                        {BUCKET_LABEL[bucket]}
                      </td>
                      <td className="px-2 py-1.5 text-center text-cream/60 tabular-nums">
                        {stats.sample}
                      </td>
                      {TENDENCY_ORDER.map((t) => (
                        <td
                          key={t}
                          className={cn(
                            "px-2 py-1.5 text-center tabular-nums",
                            dominant === t && stats.sample > 0
                              ? accentBright + " font-black"
                              : "text-cream/50",
                          )}
                        >
                          {stats.counts[t]}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-right tabular-nums text-cream/60">
                        {totalWins}W · {totalItm}I
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] font-mono text-cream/30 uppercase tracking-widest">
            Sample sizes &lt; 3 should be read with caution.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Silences unused-import warning when build tree-shakes.
export const __classifyTendency = classifyTendency;
export const __distanceBucket = distanceBucket;
