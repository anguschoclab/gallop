/**
 * RivalCareerCompareTable.tsx - Side-by-side career comparison for rival horses
 *
 * One column per rival horse with rows for age, starts, wins, win rate,
 * earnings, fame, career stage, days since last run and milestone history.
 *
 * Dependencies: @/core/npc/rivalCareerCompare (RivalCareerProfile)
 * Related files: src/routes/npc-stables.rival-careers.tsx (consumer)
 */

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatting";
import type { RivalCareerProfile } from "@/services/npc/npcFacade";
import { RivalCareerMilestoneTimeline } from "./RivalCareerMilestoneTimeline";

interface RivalCareerCompareTableProps {
  profiles: RivalCareerProfile[];
  stableNames?: Record<string, string>;
}

const ROW_LABEL_CLASS = "text-xs text-cream-muted font-medium py-2 pr-3 text-right align-top";
const CELL_CLASS = "text-xs text-cream py-2 px-3 text-center min-w-[190px] align-top";

function bestIndex(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  for (let i = 0; i < values.length; i++) if (i !== best && values[i] === values[best]) return -1;
  return best;
}

export function RivalCareerCompareTable({ profiles, stableNames }: RivalCareerCompareTableProps) {
  if (profiles.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-cream-muted">
        No rivals selected. Pick two or more rival horses to compare their careers.
      </div>
    );
  }

  const numericRows: { label: string; values: number[]; render: (v: number) => string }[] = [
    { label: "Age", values: profiles.map((p) => p.age), render: (v) => `${v}Y` },
    { label: "Starts", values: profiles.map((p) => p.starts), render: (v) => `${v}` },
    { label: "Wins", values: profiles.map((p) => p.wins), render: (v) => `${v}` },
    {
      label: "Win rate",
      values: profiles.map((p) => p.winRate),
      render: (v) => `${Math.round(v * 100)}%`,
    },
    {
      label: "Earnings",
      values: profiles.map((p) => p.earnings),
      render: (v) => formatCurrency(v),
    },
    { label: "Fame", values: profiles.map((p) => p.fame), render: (v) => `${v}` },
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
            const winner = bestIndex(row.values);
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
                <RivalCareerMilestoneTimeline milestones={p.milestones} />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
