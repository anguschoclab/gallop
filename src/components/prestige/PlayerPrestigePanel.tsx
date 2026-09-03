/**
 * PlayerPrestigePanel.tsx - Player prestige meter and rank
 *
 * Shows the player's stable on the same 0-100 prestige scale as auction houses
 * and racecourses: a meter with tier bands, the overall rank across the whole
 * venue field, and the entities immediately above and below.
 */

import { useMemo } from "react";
import { Landmark, Flag, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";
import {
  playerPrestigeStanding,
  PRESTIGE_TIER_LABELS,
  PRESTIGE_TIER_BOUNDARIES,
  type PrestigeLadderEntry,
} from "@/core/prestige";
import { cn } from "@/lib/cn";

/** Tier band boundaries used to draw ticks on the meter (ascending, excluding provincial at 0). */
const TIER_MARKS: { at: number; label: string }[] = [...PRESTIGE_TIER_BOUNDARIES]
  .filter((b) => b.min > 0)
  .sort((a, b) => a.min - b.min)
  .map((b) => ({ at: b.min, label: PRESTIGE_TIER_LABELS[b.tier] }));

function NeighbourRow({
  entry,
  direction,
}: {
  entry?: PrestigeLadderEntry;
  direction: "above" | "below";
}) {
  if (!entry) return null;
  const Icon = entry.kind === "auction_house" ? Landmark : Flag;
  return (
    <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider">
      <span className="flex items-center gap-2 text-cream/60">
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{entry.name}</span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <span className="text-cream/40">#{entry.rank}</span>
        <span className={cn(direction === "above" ? "text-warning" : "text-cream/50")}>
          {entry.prestige}
        </span>
      </span>
    </div>
  );
}

export function PlayerPrestigePanel() {
  const reputationScore = useGame((s: GameState) => s.reputation?.score ?? 0);
  const stableName = useGame((s: GameState) => s.playerProfile?.stableName);

  const standing = useMemo(
    () => playerPrestigeStanding(reputationScore, stableName || "Your stable"),
    [reputationScore, stableName],
  );

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-warning">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <Crown className="h-4 w-4 text-warning" aria-hidden="true" /> Prestige
          </CardTitle>
          <Badge variant="outline" className="border-warning/40 text-warning text-[9px]">
            {PRESTIGE_TIER_LABELS[standing.tier]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Meter */}
        <div className="bg-black/40 border border-white/5 p-4 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-cream/40">
              Prestige score
            </span>
            <span className="text-2xl font-mono font-black text-warning">
              {standing.prestige}
              <span className="text-xs text-cream/30">/100</span>
            </span>
          </div>

          <div
            className="relative h-3 w-full bg-white/5"
            role="meter"
            aria-valuenow={standing.prestige}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stable prestige ${standing.prestige} of 100, ${PRESTIGE_TIER_LABELS[standing.tier]}`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-warning/60 to-warning transition-all"
              style={{ width: `${standing.prestige}%` }}
            />
            {TIER_MARKS.map((mark) => (
              <span
                key={mark.label}
                title={`${mark.label} tier from ${mark.at}`}
                className="absolute inset-y-0 w-px bg-cream/25"
                style={{ left: `${mark.at}%` }}
              />
            ))}
          </div>

          <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-cream/30">
            <span>Provincial</span>
            <span>World class</span>
          </div>
        </div>

        {/* Ranks */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-white/5 bg-black/30 p-2">
            <div className="text-[9px] font-mono uppercase tracking-widest text-cream/40">
              Overall
            </div>
            <div className="font-mono text-sm text-cream">
              #{standing.rank}
              <span className="text-cream/30"> / {standing.total}</span>
            </div>
            <div className="text-[9px] font-mono text-cream/40">
              Top {Math.max(1, 100 - standing.percentile)}%
            </div>
          </div>
          <div className="border border-white/5 bg-black/30 p-2">
            <div className="text-[9px] font-mono uppercase tracking-widest text-cream/40">
              vs Houses
            </div>
            <div className="font-mono text-sm text-cream">
              #{standing.houseRank}
              <span className="text-cream/30"> / {standing.houseTotal + 1}</span>
            </div>
            <div className="text-[9px] font-mono text-cream/40">Auction rings</div>
          </div>
          <div className="border border-white/5 bg-black/30 p-2">
            <div className="text-[9px] font-mono uppercase tracking-widest text-cream/40">
              vs Courses
            </div>
            <div className="font-mono text-sm text-cream">
              #{standing.courseRank}
              <span className="text-cream/30"> / {standing.courseTotal + 1}</span>
            </div>
            <div className="text-[9px] font-mono text-cream/40">Racecourses</div>
          </div>
        </div>

        {/* Neighbours */}
        <div className="space-y-1.5 border-t border-white/5 pt-3">
          <NeighbourRow entry={standing.above} direction="above" />
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-warning">
            <span className="flex items-center gap-2">
              <Crown className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{stableName || "Your stable"}</span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span className="text-cream/40">#{standing.rank}</span>
              <span>{standing.prestige}</span>
            </span>
          </div>
          <NeighbourRow entry={standing.below} direction="below" />
        </div>

        <p className="text-[9px] font-mono uppercase tracking-wider text-cream/30">
          Prestige tracks your reputation on the venue scale — win graded races, trade well and
          underwrite syndicates to climb.
        </p>
      </CardContent>
    </Card>
  );
}
