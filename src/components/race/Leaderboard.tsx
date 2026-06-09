import { Link } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import type { Runner } from "@/core/race/engine/runnerBuilder";

interface LeaderboardProps {
  sorted: Array<{ r: Runner; beyer: number | null }>;
  positionRank: Map<string, number>;
  runnerOdds: Map<string, string>;
  filter: "all" | "owned" | "top5";
  sortBy: "position" | "beyer" | "velocity";
  minBeyer: number;
  onFilterChange: (val: "all" | "owned" | "top5") => void;
  onSortByChange: (val: "position" | "beyer" | "velocity") => void;
  onMinBeyerChange: (val: number) => void;
}

export function Leaderboard({
  sorted,
  positionRank,
  runnerOdds,
  filter,
  sortBy,
  minBeyer,
  onFilterChange,
  onSortByChange,
  onMinBeyerChange,
}: LeaderboardProps) {
  return (
    <div className="bg-broadcast-marquee rounded-lg p-3 space-y-3 backdrop-blur-md border border-white/5">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Live order</p>
        <div className="grid grid-cols-2 gap-2">
          <Select value={sortBy} onValueChange={(v) => onSortByChange(v as typeof sortBy)}>
            <SelectTrigger className="h-8 text-xs bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="position">Position</SelectItem>
              <SelectItem value="beyer">Proj. Beyer</SelectItem>
              <SelectItem value="velocity">Velocity</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={(v) => onFilterChange(v as typeof filter)}>
            <SelectTrigger className="h-8 text-xs bg-muted border-border text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All runners</SelectItem>
              <SelectItem value="owned">My horses</SelectItem>
              <SelectItem value="top5">Top 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground flex justify-between items-center mb-1">
            <span>
              Min <JargonTooltip term="Beyer">Beyer</JargonTooltip>
            </span>
            <span className="tabular-nums font-bold text-broadcast-accent">{minBeyer}</span>
          </label>
          <Slider
            min={0}
            max={120}
            step={5}
            value={[minBeyer]}
            onValueChange={(vals) => onMinBeyerChange(vals[0])}
            className="py-2"
          />
        </div>
      </div>
      <div className="space-y-1">
        {sorted.map(({ r, beyer }) => (
          <div
            key={r.horseId}
            className="flex items-center gap-2 text-sm py-1 border-b border-white/5 last:border-0"
          >
            <span className="w-5 text-muted-foreground tabular-nums">
              {positionRank.get(r.horseId)}
            </span>
            <div
              className="h-4 w-4 rounded-full border border-white/40 shadow-sm"
              style={{ backgroundColor: r.silk }}
            />
            <Link
              to="/stable/$horseId"
              params={{ horseId: r.horseId }}
              className={`flex-1 truncate hover:underline ${r.owned ? "font-bold text-broadcast-accent" : ""}`}
            >
              {r.name}
            </Link>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-foreground tabular-nums font-bold">
              {runnerOdds.get(r.horseId) ?? "N/A"}
            </span>
            {beyer !== null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-broadcast-accent/20 text-broadcast-accent tabular-nums font-bold">
                {beyer}
              </span>
            )}
            {r.finishTime !== null && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {r.finishTime.toFixed(1)}s
              </span>
            )}
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2">
            No runners match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}
