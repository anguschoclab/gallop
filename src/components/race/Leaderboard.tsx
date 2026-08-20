import { Link } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { LiveFreshnessBadge } from "@/components/race/LiveFreshnessBadge";
import {
  LeaderboardControlsBar,
  LeaderboardEmpty,
  LeaderboardSkeleton,
} from "@/components/leaderboard/LeaderboardPrimitives";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  BEYER_SLIDER_MIN,
  BEYER_SLIDER_MAX,
  BEYER_SLIDER_STEP,
  FINISH_TIME_DECIMALS,
  TIE_BREAK_HINT_TEXT,
} from "@/constants/raceBroadcastConstants";

interface LeaderboardProps {
  sorted: Array<{ r: Runner; beyer: number | null }>;
  positionRank: Map<string, number>;
  runnerOdds: Map<string, string>;
  filter: "all" | "owned" | "top5";
  sortBy: "position" | "beyer" | "velocity";
  minBeyer: number;
  hasTies?: boolean;
  tiedHorseIds?: Set<string>;
  lastUpdatedAt?: number;
  onFilterChange: (val: "all" | "owned" | "top5") => void;
  onSortByChange: (val: "position" | "beyer" | "velocity") => void;
  onMinBeyerChange: (val: number) => void;
}

const SORT_OPTIONS = [
  { value: "position", label: "Position" },
  { value: "beyer", label: "Proj. Beyer" },
  { value: "velocity", label: "Velocity" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All runners" },
  { value: "owned", label: "My horses" },
  { value: "top5", label: "Top 5" },
];

import { memo } from "react";

export const Leaderboard = memo(function Leaderboard({
  sorted,
  positionRank,
  runnerOdds,
  filter,
  sortBy,
  minBeyer,
  hasTies = false,
  tiedHorseIds = new Set(),
  lastUpdatedAt,
  onFilterChange,
  onSortByChange,
  onMinBeyerChange,
}: LeaderboardProps) {
  return (
    <div className="bg-broadcast-marquee rounded-lg p-3 space-y-3 backdrop-blur-md border border-white/5">
      <div>
        <div className="flex items-center justify-between px-3 sm:px-6 mb-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live order</p>
          <LiveFreshnessBadge context="Leaderboard" lastUpdatedAt={lastUpdatedAt} />
        </div>
        {hasTies && sortBy === "position" && (
          <p className="text-[10px] text-muted-foreground italic px-3 sm:px-6 mb-2">
            {TIE_BREAK_HINT_TEXT}
          </p>
        )}
        <LeaderboardControlsBar
          sortOptions={SORT_OPTIONS}
          sortValue={sortBy}
          onSortChange={(v) => onSortByChange(v as typeof sortBy)}
          filterOptions={FILTER_OPTIONS}
          filterValue={filter}
          onFilterChange={(v) => onFilterChange(v as typeof filter)}
        />
        <div className="mt-2 px-3 sm:px-6">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground flex justify-between items-center mb-1">
            <span>
              Min <JargonTooltip term="Beyer">Beyer</JargonTooltip>
            </span>
            <span className="tabular-nums font-bold text-broadcast-accent">{minBeyer}</span>
          </label>
          <Slider
            min={BEYER_SLIDER_MIN}
            max={BEYER_SLIDER_MAX}
            step={BEYER_SLIDER_STEP}
            value={[minBeyer]}
            onValueChange={(vals) => onMinBeyerChange(vals[0])}
            className="py-2"
          />
        </div>
      </div>
      <div className="space-y-1">
        {sorted.length === 0 ? (
          <LeaderboardEmpty message="No runners match the current filters." />
        ) : (
          sorted.map(({ r, beyer }) => (
            <div
              key={r.horseId}
              className="flex items-center gap-2 text-sm py-1.5 sm:py-1 border-b border-white/5 last:border-0 min-h-[36px]"
            >
              <span className="w-5 text-muted-foreground tabular-nums shrink-0">
                {positionRank.get(r.horseId)}
              </span>
              {tiedHorseIds.has(r.horseId) && (
                <span
                  data-testid="tie-marker"
                  className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"
                />
              )}
              <div
                className="h-4 w-4 rounded-full border border-white/40 shadow-sm shrink-0"
                style={{ backgroundColor: r.silk }}
              />
              <Link
                to="/stable/$horseId"
                params={{ horseId: r.horseId }}
                className={`flex-1 truncate hover:underline ${r.owned ? "font-bold text-broadcast-accent" : ""}`}
              >
                {r.name}
              </Link>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground tabular-nums font-bold shrink-0">
                {runnerOdds.get(r.horseId) ?? "N/A"}
              </span>
              {beyer !== null && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-broadcast-accent/20 text-broadcast-accent tabular-nums font-bold shrink-0">
                  {beyer}
                </span>
              )}
              {r.finishTime !== null && (
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:inline">
                  {r.finishTime.toFixed(FINISH_TIME_DECIMALS)}s
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
});
