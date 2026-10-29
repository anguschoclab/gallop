import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/shared/ui/card";
import { Activity, AlertCircle } from "lucide-react";
import { useVetReport, type VetSortBy } from "@/domains/health/application/hooks/useVetReport";
import { formatRecoveryDays } from "@/domains/health/model/injuryDisplay";
import { cn } from "@/shared/lib/cn";
import { EmptyState } from "@/shared/ui/common/EmptyState";

const STATUS_COLORS: Record<string, string> = {
  green: "text-green-400 bg-green-400/10",
  yellow: "text-yellow-400 bg-yellow-400/10",
  red: "text-red-400 bg-red-400/10",
};

export function VetReport() {
  const [sortBy, setSortBy] = useState<VetSortBy>("status");
  const { rows, summary } = useVetReport({ sortBy });

  const handleSort = (column: VetSortBy) => {
    setSortBy(column);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-foreground" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-[family-name=var(--font-display)]">
          Vet Report
        </h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-3">
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-foreground">{summary.total}</div>
            <div className="text-[10px] uppercase text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-green-400">{summary.healthy}</div>
            <div className="text-[10px] uppercase text-muted-foreground">Healthy</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-yellow-400">
              {summary.recovering}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">Recovering</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-red-400">{summary.injured}</div>
            <div className="text-[10px] uppercase text-muted-foreground">Injured</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-foreground">
              {Math.round(summary.avgFitness)}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground">Avg Fitness</div>
          </CardContent>
        </Card>
      </div>

      {/* Horse health table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No horses"
          description="No horses in the stable."
          className="bg-slate-900/40 border-white/5"
        />
      ) : (
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th
                    className="text-left p-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    Horse
                  </th>
                  <th
                    className="text-left p-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("status")}
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="text-left p-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground"
                  >
                    Injury
                  </th>
                  <th
                    scope="col"
                    className="text-right p-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground"
                  >
                    Recovery
                  </th>
                  <th
                    className="text-right p-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("fitness")}
                  >
                    Fitness
                  </th>
                  <th
                    scope="col"
                    className="text-right p-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground"
                  >
                    Fatigue
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.horseId} className="border-b border-white/5 last:border-0">
                    <td className="p-3">
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: row.horseId }}
                        className="text-sm font-bold text-foreground hover:text-foreground"
                      >
                        {row.horseName}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 text-[10px] font-black uppercase rounded",
                          STATUS_COLORS[row.statusColor],
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-foreground">
                      {row.activeInjury ? (
                        <span className="flex items-center gap-1 text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {row.activeInjury.type}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-sm tabular-nums text-foreground">
                      {row.recoveryDays > 0
                        ? formatRecoveryDays(
                            row.recoveryDays,
                            row.activeInjury?.severity ?? "minor",
                          )
                        : "—"}
                    </td>
                    <td className="p-3 text-right text-sm tabular-nums text-foreground">
                      {Math.round(row.fitness)}
                    </td>
                    <td className="p-3 text-right text-sm tabular-nums text-foreground">
                      {Math.round(row.fatigue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
