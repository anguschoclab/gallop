import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Trophy, Film } from "lucide-react";
import { useReplaysLibrary } from "@/hooks/replays/useReplaysLibrary";
import { cn } from "@/lib/cn";

export function ReplaysLibrary() {
  const [horseFilter, setHorseFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "win" | "place" | "show">("all");

  const { replays, highlights } = useReplaysLibrary({
    horseId: horseFilter || undefined,
    resultFilter,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Film className="h-5 w-5 text-cream" />
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name=var(--font-display)]">
          Replays
        </h1>
      </div>

      {/* Highlight reel */}
      {highlights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gold">
              Highlight Reel
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {highlights.map((replay) => (
              <ReplayCard key={replay.raceId} replay={replay} highlight />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Filter by horse ID"
          aria-label="Filter by horse ID"
          value={horseFilter}
          onChange={(e) => setHorseFilter(e.target.value)}
          className="px-3 py-1 text-sm bg-slate-900/40 border border-white/5 text-cream placeholder:text-cream-muted"
        />
        <div className="flex gap-1">
          {(["all", "win", "place", "show"] as const).map((rf) => (
            <button
              key={rf}
              type="button"
              aria-pressed={resultFilter === rf}
              aria-label={`Filter by ${rf}`}
              onClick={() => setResultFilter(rf)}
              className={cn(
                "px-3 py-1 text-xs font-bold uppercase tracking-wide border transition-colors",
                resultFilter === rf
                  ? "bg-cream/10 border-cream/30 text-cream"
                  : "bg-transparent border-white/5 text-cream-muted hover:text-cream",
              )}
            >
              {rf === "all" ? "All" : rf === "win" ? "Wins" : rf === "place" ? "Places" : "Shows"}
            </button>
          ))}
        </div>
      </div>

      {/* All replays */}
      {replays.length === 0 ? (
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-8 text-center text-cream-muted">
            No replays available. Replays are generated when races are resolved.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {replays.map((replay) => (
            <ReplayCard key={replay.raceId} replay={replay} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReplayCard({
  replay,
  highlight,
}: {
  replay: {
    raceId: string;
    raceName: string;
    day: number;
    distance: number;
    grade?: string;
    surface?: string;
    playerPosition?: number;
  };
  highlight?: boolean;
}) {
  return (
    <Link to="/race/$raceId" params={{ raceId: replay.raceId }}>
      <Card
        className={cn(
          "bg-slate-900/40 border-white/5 hover:border-cream/20 transition-colors",
          highlight && "border-gold/20",
        )}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-3 w-3 text-cream-muted" />
              <span className="text-sm font-bold text-cream">{replay.raceName}</span>
            </div>
            {replay.grade && (
              <Badge className="text-[9px] uppercase bg-gold/10 text-gold">{replay.grade}</Badge>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-cream-muted tabular-nums">
            <span>Day {replay.day}</span>
            <span>{replay.distance.toLocaleString()}m</span>
            {replay.surface && <span className="uppercase">{replay.surface}</span>}
          </div>
          {replay.playerPosition !== undefined && (
            <div className="text-[10px] text-cream-muted">Finish: #{replay.playerPosition}</div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
