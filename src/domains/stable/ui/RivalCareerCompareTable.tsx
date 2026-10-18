/**
 * RivalCareerCompareTable.tsx - Side-by-side career comparison for rival horses
 *
 * One column per rival horse with rows for age, starts, wins, win rate,
 * earnings, fame, career stage, days since last run and milestone history.
 *
 * Dependencies: @/domains/agents/simulation/npc/rivalCareerCompare (RivalCareerProfile)
 * Related files: src/routes/npc-stables.rival-careers.tsx (consumer)
 */

import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/common/formatting";;
import type { RivalCareerProfile, RivalRankingsColumn } from "@/domains/agents/application/npcFacade";
import { RivalCareerMilestoneTimeline } from "@/domains/stable/ui/RivalCareerMilestoneTimeline";

interface RivalCareerCompareTableProps {
  profiles: RivalCareerProfile[];
  stableNames?: Record<string, string>;
  /** Same-day rank/points/price comparison vs a baseline; columns align with `profiles`. */
  rankings?: {
    day: number;
    baselineLabel: string;
    columns: RivalRankingsColumn[];
  };
}

const ROW_LABEL_CLASS = "text-xs text-cream-muted font-medium py-2 pr-3 text-right align-top";
const CELL_CLASS = "text-xs text-cream py-2 px-3 text-center min-w-[190px] align-top";

function bestIndex(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  for (let i = 0; i < values.length; i++) if (i !== best && values[i] === values[best]) return -1;
  return best;
}

function rankGapText(gap: number | null): string {
  if (gap === null) return "—";
  if (gap === 0) return "Level";
  const n = Math.abs(gap);
  return `${n} place${n === 1 ? "" : "s"} ${gap < 0 ? "ahead" : "behind"}`;
}

function signedText(n: number, money = false): string {
  if (n === 0) return "Level";
  return `${n > 0 ? "+" : "−"}${money ? formatCurrency(Math.abs(n)) : Math.abs(Math.round(n * 10) / 10)}`;
}

export function RivalCareerCompareTable({
  profiles,
  stableNames,
  rankings,
}: RivalCareerCompareTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-cream-muted">
        No rivals selected. Pick two or more rival horses to compare their careers.
      </div>
    );
  }

  const numericRows: {
    label: string;
    values: number[];
    render: (v: number) => string;
    invert?: boolean;
  }[] = [
    { label: "Age", values: profiles.map((p) => p.age), render: (v) => `${v}Y` },
    { label: "Starts", values: profiles.map((p) => p.starts), render: (v) => `${v}` },
    { label: "Wins", values: profiles.map((p) => p.wins), render: (v) => `${v}` },
    {
      label: "Win rate",
      values: profiles.map((p) => p.winRate),
      render: (v) => `${Math.round(v * 100)}%`,
    },
    {
      label: "Place rate",
      values: profiles.map((p) => p.placeRate),
      render: (v) => `${Math.round(v * 100)}%`,
    },
    {
      label: "Avg finish",
      values: profiles.map((p) => p.avgFinish),
      render: (v) => (v === 0 ? "—" : v.toFixed(1)),
      invert: true,
    },
    {
      label: "Earnings",
      values: profiles.map((p) => p.earnings),
      render: (v) => formatCurrency(v),
    },
    {
      label: "Prize / start",
      values: profiles.map((p) => p.prizePerStart),
      render: (v) => formatCurrency(v),
    },
    { label: "Fame", values: profiles.map((p) => p.fame), render: (v) => `${v}` },
    {
      label: "Efficiency",
      values: profiles.map((p) => p.efficiencyScore),
      render: (v) => `${v}`,
    },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className={`${ROW_LABEL_CLASS} text-left`}>Rival</th>
            {profiles.map((p) => (
              <th
                key={p.id}
                className={`${CELL_CLASS} font-[family-name:var(--font-display)] text-sm text-cream`}
              >
                <div>{p.name}</div>
                {p.stableId && stableNames?.[p.stableId] && (
                  <div className="text-[10px] font-normal text-cream-muted mt-0.5">
                    {stableNames[p.stableId]}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {numericRows.map((row) => {
            const winner = bestIndex(
              row.invert ? row.values.map((v) => (v === 0 ? -Infinity : -v)) : row.values,
            );
            return (
              <tr key={row.label} className="border-b border-border/50">
                <td className={ROW_LABEL_CLASS}>{row.label}</td>
                {row.values.map((v, i) => (
                  <td
                    key={profiles[i].id}
                    className={`${CELL_CLASS} font-mono tabular-nums ${
                      winner === i ? "text-gold font-bold" : ""
                    }`}
                  >
                    {row.render(v)}
                  </td>
                ))}
              </tr>
            );
          })}

          {rankings ? (
            <>
              <tr className="border-b border-border/50">
                <td
                  colSpan={profiles.length + 1}
                  className="pt-3 pb-1 text-[10px] font-black uppercase tracking-wide text-gold"
                >
                  Daily rankings — Day {rankings.day} · vs {rankings.baselineLabel}
                </td>
              </tr>
              {(
                [
                  {
                    label: "Rank",
                    value: (c: RivalRankingsColumn) =>
                      c.values ? (c.values.rank ? `#${c.values.rank}` : "Unranked") : null,
                    gap: (c: RivalRankingsColumn) => (c.gap ? rankGapText(c.gap.rank) : "—"),
                  },
                  {
                    label: "Points",
                    value: (c: RivalRankingsColumn) =>
                      c.values ? c.values.points.toFixed(1) : null,
                    gap: (c: RivalRankingsColumn) => (c.gap ? signedText(c.gap.points) : "—"),
                  },
                  {
                    label: "Value",
                    value: (c: RivalRankingsColumn) =>
                      c.values ? formatCurrency(c.values.price) : null,
                    gap: (c: RivalRankingsColumn) => (c.gap ? signedText(c.gap.price, true) : "—"),
                  },
                ] as const
              ).map((row) => (
                <tr key={row.label} className="border-b border-border/50">
                  <td className={ROW_LABEL_CLASS}>{row.label}</td>
                  {profiles.map((p, i) => {
                    const col = rankings.columns[i];
                    const value = col ? row.value(col) : null;
                    return (
                      <td key={p.id} className={CELL_CLASS}>
                        {value === null ? (
                          <span className="text-cream-muted">No record</span>
                        ) : (
                          <>
                            <div className="font-mono tabular-nums">{value}</div>
                            <div className="text-[10px] text-cream-muted">
                              {col ? row.gap(col) : "—"}
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ) : null}

          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Career stage</td>
            {profiles.map((p) => (
              <td key={p.id} className={CELL_CLASS}>
                <Badge variant="secondary" className="text-[10px]">
                  {p.stageLabel}
                </Badge>
              </td>
            ))}
          </tr>

          <tr className="border-b border-border/50">
            <td className={ROW_LABEL_CLASS}>Days since last run</td>
            {profiles.map((p) => (
              <td key={p.id} className={`${CELL_CLASS} font-mono tabular-nums`}>
                {p.daysSinceStart === null ? "—" : p.daysSinceStart}
              </td>
            ))}
          </tr>

          <tr>
            <td className={ROW_LABEL_CLASS}>Milestones</td>
            {profiles.map((p) => (
              <td key={p.id} className={`${CELL_CLASS} text-left`}>
                <RivalCareerMilestoneTimeline milestones={p.milestones} horseId={p.id} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
