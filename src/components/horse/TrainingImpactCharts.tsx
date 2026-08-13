/**
 * TrainingImpactCharts.tsx - Correlates a horse's pre-race training load with
 * next-start outcomes: form sparkline, strike rate by training load, and
 * expected vs actual finish distribution.
 */
import { useMemo } from "react";
import { ChartCard, MiniBar, Sparkline, StackedRatioBar, chartColors } from "@/components/charts";
import type { Horse } from "@/game/types";
import type { Transaction } from "@/core/transactions";

interface TrainingImpactChartsProps {
  horse: Horse;
  transactions: Transaction[];
  /** Days before a start counted as its preparation window. */
  lookback?: number;
}

type LoadBucket = "Light (0-2)" | "Moderate (3-5)" | "Heavy (6+)";

function loadBucket(sessions: number): LoadBucket {
  if (sessions <= 2) return "Light (0-2)";
  if (sessions <= 5) return "Moderate (3-5)";
  return "Heavy (6+)";
}

function finishBand(position: number): 0 | 1 | 2 | 3 {
  if (position === 1) return 0;
  if (position <= 3) return 1;
  if (position <= 6) return 2;
  return 3;
}

export function TrainingImpactCharts({
  horse,
  transactions,
  lookback = 14,
}: TrainingImpactChartsProps) {
  const derived = useMemo(() => {
    const runs = [...(horse.raceHistory ?? [])].sort((a, b) => a.day - b.day);
    const trainingDays = transactions
      .filter((t) => t.subcategory === "training" && t.horseId === horse.id)
      .map((t) => t.day);

    const buckets = new Map<LoadBucket, { starts: number; wins: number; posSum: number }>();
    const actual = [0, 0, 0, 0];
    const expected = [0, 0, 0, 0];
    const form: number[] = [];

    runs.forEach((r, i) => {
      const sessions = trainingDays.filter((d) => d > r.day - lookback && d <= r.day).length;
      const key = loadBucket(sessions);
      const b = buckets.get(key) ?? { starts: 0, wins: 0, posSum: 0 };
      b.starts++;
      b.posSum += r.position;
      if (r.position === 1) b.wins++;
      buckets.set(key, b);

      actual[finishBand(r.position)]++;

      // Expected finish = rolling average of prior finishes (career par)
      const prior = runs.slice(Math.max(0, i - 5), i);
      const par = prior.length
        ? prior.reduce((s, x) => s + x.position, 0) / prior.length
        : r.position;
      expected[finishBand(Math.max(1, Math.round(par)))]++;

      const field = r.fieldSize ?? 8;
      form.push(Math.round(((field - r.position) / Math.max(1, field - 1)) * 100));
    });

    const loadRows = (["Light (0-2)", "Moderate (3-5)", "Heavy (6+)"] as LoadBucket[])
      .filter((k) => buckets.has(k))
      .map((k) => {
        const v = buckets.get(k)!;
        return {
          label: k,
          value: Math.round((v.wins / v.starts) * 100),
          hint: `${v.wins}W / ${v.starts} starts · avg finish ${(v.posSum / v.starts).toFixed(1)}`,
          color: chartColors.primary,
        };
      });

    return { loadRows, actual, expected, form, starts: runs.length };
  }, [horse, transactions, lookback]);

  if (derived.starts === 0) return null;

  const bands = ["Win", "2nd-3rd", "4th-6th", "7th+"];
  const colors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.tertiary,
    chartColors.slate,
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ChartCard
        title="Form Trend"
        subtitle={`${derived.starts} starts`}
        footnote="Finish position as % of field beaten"
      >
        {derived.form.length < 2 ? (
          <div className="px-2 py-5 text-center font-mono text-xs text-cream/60">
            Single start so far
          </div>
        ) : (
          <div className="px-2 pt-2">
            <Sparkline data={derived.form} height={72} />
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Strike Rate by Training Load"
        footnote={`Sessions in the ${lookback} days before each start`}
      >
        <div className="px-2 pt-2">
          <MiniBar rows={derived.loadRows} max={100} format={(n) => `${n}%`} />
        </div>
      </ChartCard>

      <ChartCard title="Expected vs Actual Finishes" footnote="Expected = rolling 5-start par">
        <div className="space-y-3 px-2 pt-2">
          <div>
            <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-cream/35">
              Expected
            </div>
            <StackedRatioBar
              segments={bands.map((label, i) => ({
                key: `e${i}`,
                label,
                value: derived.expected[i],
                color: colors[i],
              }))}
            />
          </div>
          <div>
            <div className="mb-1 font-mono text-[9px] uppercase tracking-wider text-cream/35">
              Actual
            </div>
            <StackedRatioBar
              segments={bands.map((label, i) => ({
                key: `a${i}`,
                label,
                value: derived.actual[i],
                color: colors[i],
              }))}
            />
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
