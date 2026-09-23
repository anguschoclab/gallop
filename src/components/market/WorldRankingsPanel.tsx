/**
 * WorldRankingsPanel.tsx - Top horses by recent race results, with the price
 * premium their form adds at the auction houses.
 */

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Horse } from "@/game/types";
import { getWorldRankings } from "@/services/market/auctionHouseService";

export function WorldRankingsPanel({ horses, day }: { horses: Horse[]; day: number }) {
  const rows = useMemo(() => getWorldRankings(horses, day, 365, 15), [horses, day]);

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-cream/70">
        <Trophy className="h-3.5 w-3.5 text-primary" />
        World rankings — last 12 months
      </h3>
      {rows.length === 0 ? (
        <p className="text-[11px] font-mono uppercase tracking-wide text-cream/30">
          No races run yet this season.
        </p>
      ) : (
        <div className="divide-y divide-white/5 border border-white/5 bg-slate-900/40">
          {rows.map((r, i) => (
            <div key={r.horseId} className="flex flex-wrap items-center gap-3 p-2.5 text-[11px] font-mono">
              <span className="w-6 text-right tabular-nums font-black text-primary">{i + 1}</span>
              <span className="flex-1 min-w-[140px] font-sans font-bold text-cream">{r.name}</span>
              <span className="text-cream/40 truncate max-w-[220px]">
                {r.lastWin
                  ? `Won ${r.lastWin.grade ? `${r.lastWin.grade} ` : ""}${r.lastWin.raceName} (day ${r.lastWin.day})`
                  : "Placed, no wins"}
              </span>
              <span className="tabular-nums text-cream/60">
                {r.wins}/{r.starts}
                {r.gradedWins > 0 ? ` · ${r.gradedWins} graded` : ""}
              </span>
              <span className="tabular-nums font-bold text-cream w-14 text-right">{r.points} pts</span>
              <Badge variant="outline" className="text-[9px] text-success border-success/40">
                +{Math.round((r.premium - 1) * 100)}% value
              </Badge>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
