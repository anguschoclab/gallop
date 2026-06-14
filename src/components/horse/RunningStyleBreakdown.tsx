/**
 * RunningStyleBreakdown — Compares a horse's declared (genetic) running style
 * against its observed pace behavior across all logged races. Shows pace tendency
 * distribution at the first call and the corresponding win rate per tendency so
 * the player can see what shape of race actually suits the horse.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import type { Horse, RunningStyle } from "@/game/types";
import { derivePaceStyleLabel } from "@/core/race/sectionalAnalysis";

interface RunningStyleBreakdownProps {
  horse: Horse;
}

const STYLE_META: Record<RunningStyle, { label: string; blurb: string }> = {
  E: {
    label: "Early Speed",
    blurb: "Breaks alertly and looks to make the lead from the gate.",
  },
  EP: {
    label: "Early / Presser",
    blurb: "Shows speed but is content tracking just off the leaders.",
  },
  P: {
    label: "Presser",
    blurb: "Settles mid-pack, then ranges up turning for home.",
  },
  S: {
    label: "Stalker / Closer",
    blurb: "Drops out early and finishes hard from off the pace.",
  },
};

type Tendency = "Lead" | "Stalk" | "Midpack" | "Back";

function classifyFirstCall(pos: number, fieldSize?: number): Tendency {
  const f = fieldSize ?? 8;
  if (pos <= 1.5) return "Lead";
  if (pos <= Math.max(3, f * 0.35)) return "Stalk";
  if (pos <= Math.max(5, f * 0.65)) return "Midpack";
  return "Back";
}

const TENDENCY_ORDER: Tendency[] = ["Lead", "Stalk", "Midpack", "Back"];

export function RunningStyleBreakdown({ horse }: RunningStyleBreakdownProps) {
  const declared = (horse.runningStyle ?? "P") as RunningStyle;
  const declaredMeta = STYLE_META[declared] ?? STYLE_META.P;

  const racesWithPace = (horse.raceHistory ?? []).filter(
    (r: any) => r.pacePositions && r.pacePositions.length > 0,
  );

  // Average position per call segment
  const maxQuarters = racesWithPace.reduce(
    (m, r: any) => Math.max(m, r.pacePositions?.length ?? 0),
    0,
  );
  const avgPositions: number[] = [];
  for (let q = 0; q < maxQuarters; q++) {
    const ps = racesWithPace
      .map((r: any) => r.pacePositions?.[q])
      .filter((p): p is number => typeof p === "number");
    if (ps.length) avgPositions.push(ps.reduce((a, b) => a + b, 0) / ps.length);
  }
  const observed = avgPositions.length ? derivePaceStyleLabel(avgPositions) : null;

  // Tendency distribution + wins by tendency (based on first call)
  const tally: Record<Tendency, { runs: number; wins: number }> = {
    Lead: { runs: 0, wins: 0 },
    Stalk: { runs: 0, wins: 0 },
    Midpack: { runs: 0, wins: 0 },
    Back: { runs: 0, wins: 0 },
  };
  for (const r of racesWithPace as any[]) {
    const t = classifyFirstCall(r.pacePositions[0], r.fieldSize);
    tally[t].runs += 1;
    if (r.position === 1) tally[t].wins += 1;
  }
  const total = racesWithPace.length;

  return (
    <section className="space-y-4 pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Gauge className="h-4 w-4 text-gold" />
        <h2 className="text-sm font-black uppercase tracking-[0.3em] text-cream">
          Running Style Breakdown
        </h2>
      </div>

      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-gold">
        <CardContent className="p-6 space-y-6">
          {/* Declared vs observed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/30 border border-white/5 p-4">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                Declared (Genetic)
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-gold">{declared}</span>
                <span className="text-xs font-bold text-cream/80 uppercase tracking-wide">
                  {declaredMeta.label}
                </span>
              </div>
              <p className="text-[11px] text-cream/50 mt-1.5 leading-snug">{declaredMeta.blurb}</p>
            </div>
            <div className="bg-black/30 border border-white/5 p-4">
              <div className="text-[9px] font-black uppercase text-cream/30 tracking-widest mb-1">
                Observed (Race History)
              </div>
              {observed ? (
                <>
                  <div className="text-xs font-black text-gold-bright uppercase tracking-tight">
                    {observed}
                  </div>
                  <p className="text-[11px] text-cream/50 mt-1.5 leading-snug">
                    Derived from {total} race{total === 1 ? "" : "s"} with sectional data.
                  </p>
                </>
              ) : (
                <p className="text-[11px] font-mono text-cream/30 italic uppercase">
                  No pace data yet — needs at least one race with sectional times.
                </p>
              )}
            </div>
          </div>

          {/* Tendency distribution */}
          {total > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="text-[10px] font-black uppercase text-cream/30 tracking-widest">
                First-Call Tendency · Win Rate by Position
              </div>
              <div className="space-y-2">
                {TENDENCY_ORDER.map((t) => {
                  const { runs, wins } = tally[t];
                  const sharePct = total ? (runs / total) * 100 : 0;
                  const winPct = runs ? (wins / runs) * 100 : 0;
                  return (
                    <div key={t} className="flex items-center gap-3">
                      <div className="w-16 text-[10px] font-bold uppercase tracking-wider text-cream/60">
                        {t}
                      </div>
                      <div className="flex-1 h-5 bg-black/40 border border-white/5 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gold/30"
                          style={{ width: `${sharePct}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-gold-bright/80"
                          style={{ width: `${sharePct * (winPct / 100)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-mono text-cream/80 tabular-nums">
                          <span>
                            {runs} run{runs === 1 ? "" : "s"} · {sharePct.toFixed(0)}%
                          </span>
                          <span className={winPct > 0 ? "text-gold-bright" : "text-cream/30"}>
                            {wins}W · {winPct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-[9px] font-mono uppercase text-cream/30 tracking-wider pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 bg-gold/30" /> Share of runs
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-3 bg-gold-bright/80" /> Won from this trip
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
