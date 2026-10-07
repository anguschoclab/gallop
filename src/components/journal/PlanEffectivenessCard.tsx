import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  planEffectiveness,
  type PlanDimension,
  type StrategyJournalEntry,
} from "@/core/tactics/strategyJournal";

const DIMS: { v: PlanDimension; label: string }[] = [
  { v: "ridingStyle", label: "Riding style" },
  { v: "earlyPosition", label: "Early position" },
  { v: "moveTiming", label: "Move timing" },
  { v: "aggression", label: "Aggression" },
  { v: "source", label: "Plan type" },
];
const pct = (n: number) => `${Math.round(n * 100)}%`;

export function PlanEffectivenessCard({ journal }: { journal: StrategyJournalEntry[] }) {
  const [dim, setDim] = useState<PlanDimension>("ridingStyle");
  const rows = useMemo(() => planEffectiveness(journal, dim), [journal, dim]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide">Plan effectiveness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Group plans by">
          {DIMS.map((d) => (
            <Button
              key={d.v}
              size="sm"
              variant={dim === d.v ? "default" : "outline"}
              onClick={() => setDim(d.v)}
            >
              {d.label}
            </Button>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Scores appear once journaled races have been run.
          </p>
        ) : (
          <table className="w-full text-sm font-mono">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1 text-left">Plan</th>
                <th className="text-right">Score</th>
                <th className="text-right">Runs</th>
                <th className="text-right">Win %</th>
                <th className="text-right">Top 3 %</th>
                <th className="text-right">Avg finish</th>
                <th className="text-right">Prize money</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-border">
                  <td className="py-1.5">{r.key}</td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded bg-muted">
                        <span
                          className="block h-full bg-primary"
                          style={{ width: `${r.score}%` }}
                        />
                      </span>
                      {r.score}
                    </span>
                  </td>
                  <td className="text-right">{r.runs}</td>
                  <td className="text-right">{pct(r.winRate)}</td>
                  <td className="text-right">{pct(r.placeRate)}</td>
                  <td className="text-right">{r.avgFinish.toFixed(1)}</td>
                  <td className="text-right">${Math.round(r.prizeMoney).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-muted-foreground">
          Score (0-100) weighs wins most, then top-3 finishes, then how far up the field the horse
          finished. Plans with only a few runs are pulled toward your journal average until there's
          enough evidence.
        </p>
      </CardContent>
    </Card>
  );
}
