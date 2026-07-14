import { useMemo, useState } from "react";
import type { Horse } from "@/game/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SilkDot } from "@/components/SilkDot";
import { NumericValue, formatCurrency, HorseStats } from "@/components/horse/HorseBits";
import { calculateOverallRating } from "@/core/horse/stats";
import { horseMarketValue } from "@/core/horse/pricing";
import { calculateHeadToHeadOdds, runHeadToHeadSimulation } from "@/core/race/headToHead";
import { cn } from "@/lib/cn";

interface HorseCompareProps {
  horses: Horse[]; // 1-3 selected horses
  allHorses?: Horse[]; // for pedigree-aware valuation
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RowData {
  label: string;
  values: (string | number)[];
  /** Optional: for numeric rows, pass the raw numbers to highlight the winner. */
  numeric?: number[];
  higherIsBetter?: boolean;
  /** Optional: raw stat values (0-100) for inline stat bar rendering */
  barValues?: number[];
}

function beyerSummary(h: Horse) {
  const beyers = h.raceHistory.map((r) => r.beyer).filter((b): b is number => typeof b === "number");
  if (beyers.length === 0) return { min: null, avg: null, max: null };
  const min = Math.min(...beyers);
  const max = Math.max(...beyers);
  const avg = Math.round(beyers.reduce((a, b) => a + b, 0) / beyers.length);
  return { min, avg, max };
}

function careerRecord(h: Horse) {
  const starts = h.raceHistory.length;
  let wins = 0,
    places = 0,
    shows = 0,
    earnings = 0;
  for (const r of h.raceHistory) {
    if (r.position === 1) wins++;
    else if (r.position === 2) places++;
    else if (r.position === 3) shows++;
    earnings += r.purseEarned ?? 0;
  }
  return { starts, wins, places, shows, earnings };
}

function bestIdx(nums: number[], higher: boolean): number {
  let best = 0;
  for (let i = 1; i < nums.length; i++) {
    if (higher ? nums[i] > nums[best] : nums[i] < nums[best]) best = i;
  }
  // Tie detection: if any other value equals the best, return -1
  for (let i = 0; i < nums.length; i++) {
    if (i !== best && nums[i] === nums[best]) return -1;
  }
  return best;
}

export function HorseCompare({ horses, allHorses = [], open, onOpenChange }: HorseCompareProps) {
  const rows = useMemo<RowData[]>(() => {
    if (horses.length === 0) return [];
    const ovr = horses.map(calculateOverallRating);
    const val = horses.map((h) => horseMarketValue(h, allHorses));
    const records = horses.map(careerRecord);
    const beyers = horses.map(beyerSummary);

    return [
      {
        label: "Rating (OVR)",
        values: ovr,
        numeric: ovr,
        higherIsBetter: true,
        barValues: ovr,
      },
      {
        label: "Potential",
        values: horses.map((h) => h.potential),
        numeric: horses.map((h) => h.potential),
        higherIsBetter: true,
        barValues: horses.map((h) => h.potential),
      },
      {
        label: "Energy",
        values: horses.map((h) => `${h.energy}/100`),
        numeric: horses.map((h) => h.energy),
        higherIsBetter: true,
        barValues: horses.map((h) => h.energy),
      },
      {
        label: "Form",
        values: horses.map((h) => (h.form > 0 ? `+${h.form}` : `${h.form}`)),
        numeric: horses.map((h) => h.form),
        higherIsBetter: true,
        barValues: horses.map((h) => Math.max(0, Math.min(100, h.form))),
      },
      {
        label: "Valuation",
        values: val.map((v) => formatCurrency(v)),
        numeric: val,
        higherIsBetter: true,
      },
      {
        label: "Career starts",
        values: records.map((r) => r.starts),
        numeric: records.map((r) => r.starts),
        higherIsBetter: true,
      },
      {
        label: "Record (W-P-S)",
        values: records.map((r) => `${r.wins}-${r.places}-${r.shows}`),
        numeric: records.map((r) => r.wins),
        higherIsBetter: true,
      },
      {
        label: "Earnings",
        values: records.map((r) => formatCurrency(r.earnings)),
        numeric: records.map((r) => r.earnings),
        higherIsBetter: true,
      },
      {
        label: "Beyer avg",
        values: beyers.map((b) => (b.avg == null ? "—" : b.avg)),
        numeric: beyers.map((b) => b.avg ?? -Infinity),
        higherIsBetter: true,
      },
      {
        label: "Beyer range",
        values: beyers.map((b) => (b.min == null ? "—" : `${b.min}–${b.max}`)),
      },
    ];
  }, [horses, allHorses]);

  const surfaces: Array<"Turf" | "Dirt" | "Synthetic"> = ["Turf", "Dirt", "Synthetic"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] uppercase tracking-widest text-sm text-gold">
            Compare Horses · {horses.length}
          </DialogTitle>
        </DialogHeader>

        {horses.length < 2 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Select 2 or 3 horses from the roster to compare.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Header row: silk + name + age/gender */}
            <div
              className={cn(
                "grid gap-4 border-b border-white/10 pb-4",
                horses.length === 2 ? "grid-cols-[1fr_1fr]" : "grid-cols-[1fr_1fr_1fr]",
              )}
            >
              {horses.map((h) => (
                <div key={h.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SilkDot color={h.silk} />
                    <span className="font-bold font-[family-name:var(--font-display)]">
                      {h.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {Math.floor(h.age)}Y {h.gender}
                    </Badge>
                    {h.activeInjury && (
                      <Badge variant="destructive" className="text-[10px]">
                        Injured
                      </Badge>
                    )}
                    {h.lifecycleStatus === "retired" && (
                      <Badge variant="outline" className="text-[10px]">
                        Retired
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Metric table */}
            <div className="rounded border border-white/5 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-[11px] uppercase tracking-widest font-mono text-cream/50 w-40 text-left">
                      Metric
                    </th>
                    {horses.map((h) => (
                      <th key={h.id} className="px-3 py-2 text-left">
                        <div className="flex items-center gap-1.5">
                          <SilkDot color={h.silk} size="sm" />
                          <span className="font-bold font-[family-name:var(--font-display)] text-xs text-cream">
                            {h.name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.map((row) => {
                    const winner =
                      row.numeric && row.higherIsBetter !== undefined
                        ? bestIdx(row.numeric, row.higherIsBetter)
                        : -1;
                    return (
                      <tr key={row.label} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-[11px] uppercase tracking-widest font-mono text-cream/50 w-40">
                          {row.label}
                        </td>
                        {row.values.map((v, i) => (
                          <td
                            key={i}
                            className={cn(
                              "px-3 py-2 font-mono tabular-nums",
                              winner === i
                                ? "bg-gold/10 text-gold font-bold"
                                : "text-cream/80",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{v}</span>
                              {row.barValues && row.barValues[i] !== undefined && (
                                <Progress
                                  value={row.barValues[i]}
                                  className="h-1 w-16"
                                />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Surface preferences */}
            <div>
              <h4 className="text-[11px] uppercase tracking-widest font-mono text-cream/50 mb-2">
                Surface aptitude
              </h4>
              <div
                className={cn(
                  "grid gap-4",
                  horses.length === 2 ? "grid-cols-2" : "grid-cols-3",
                )}
              >
                {horses.map((h) => (
                  <div key={h.id} className="space-y-2">
                    <div className="text-xs font-medium text-cream/70">{h.name}</div>
                    {surfaces.map((s) => {
                      const val = Math.round((h.surfaceAptitude[s] ?? 0) * 100);
                      return (
                        <div key={s}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{s}</span>
                            <NumericValue value={val} suffix="%" />
                          </div>
                          <Progress value={val} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Stat bars */}
            <div>
              <h4 className="text-[11px] uppercase tracking-widest font-mono text-cream/50 mb-2">
                Stats
              </h4>
              <div
                className={cn(
                  "grid gap-4",
                  horses.length === 2 ? "grid-cols-2" : "grid-cols-3",
                )}
              >
                {horses.map((h) => (
                  <div key={h.id} className="space-y-2">
                    <div className="text-xs font-medium text-cream/70">{h.name}</div>
                    <HorseStats horse={h} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
