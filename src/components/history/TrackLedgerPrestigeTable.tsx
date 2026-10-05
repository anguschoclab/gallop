import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import type { StablePrestigeDelta } from "@/services/history/historyFacade";

type Row = StablePrestigeDelta & { races: number; wins: number };

export function TrackLedgerPrestigeTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((r) => Math.abs(r.delta)), 1);

  return (
    <Card className="border-white/5 bg-slate-900/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-wide text-cream/60">
            Prestige Movement at this Course
          </h3>
        </div>
        <div className="space-y-1.5">
          {rows.slice(0, 20).map((row) => (
            <div key={row.stableId} className="flex items-center gap-3 text-xs">
              <span className="w-40 shrink-0 truncate text-cream flex items-center gap-1.5">
                {row.stableName}
                {row.isPlayer && (
                  <Badge variant="default" className="text-[9px]">
                    You
                  </Badge>
                )}
              </span>
              <span className="w-28 shrink-0 text-cream-muted tabular-nums">
                {row.races} run{row.races === 1 ? "" : "s"} · {row.wins} win
                {row.wins === 1 ? "" : "s"}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.delta >= 0 ? "bg-emerald-500/70" : "bg-rose-500/70"}`}
                  style={{ width: `${(Math.abs(row.delta) / max) * 100}%` }}
                />
              </div>
              <span
                className={`w-12 text-right tabular-nums font-semibold ${
                  row.delta > 0 ? "text-emerald-400" : row.delta < 0 ? "text-rose-400" : "text-cream-muted"
                }`}
              >
                {row.delta > 0 ? "+" : ""}
                {row.delta}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
