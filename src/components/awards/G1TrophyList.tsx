import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { type G1WinEntry, countByGrade } from "@/constants/connectionTrophies";
import { cn } from "@/lib/cn";

interface G1TrophyListProps {
  wins: G1WinEntry[];
  title?: string;
  emptyHint?: string;
  /** Max rows to render in full (rest collapsed into a "+N more" line). */
  limit?: number;
  /** Compact variant — fewer paddings, used in sidebars. */
  compact?: boolean;
}

const gradeBg: Record<string, string> = {
  G1: "bg-gold/15 text-gold border-gold/30",
  G2: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  G3: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

const yearFor = (day: number) => Math.floor((day - 1) / 365) + 1;

export function G1TrophyList({
  wins,
  title = "Graded Wins",
  emptyHint = "No graded wins yet.",
  limit = 12,
  compact = false,
}: G1TrophyListProps) {
  const counts = countByGrade(wins);
  const visible = wins.slice(0, limit);
  const extra = wins.length - visible.length;

  return (
    <Card className="border-gold-muted">
      <CardHeader className={cn(compact && "pb-2")}>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-[family-name:var(--font-display)] flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-gold" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-1.5 font-mono text-[10px] tabular-nums">
            {(["G1", "G2", "G3"] as const).map((g) => (
              <span
                key={g}
                className={cn(
                  "px-1.5 py-0.5 border rounded-sm",
                  counts[g] > 0 ? gradeBg[g] : "border-white/5 text-cream/20",
                )}
              >
                {g} ×{counts[g]}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-1", compact && "pt-0")}>
        {wins.length === 0 ? (
          <p className="text-xs text-cream-muted italic">{emptyHint}</p>
        ) : (
          <>
            <ul className="divide-y divide-white/5">
              {visible.map((w, i) => (
                <li
                  key={`${w.raceId ?? w.raceName}-${w.horseId}-${i}`}
                  className="flex items-center justify-between gap-2 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-4 px-1 text-[9px] font-black tabular-nums",
                        gradeBg[w.grade],
                      )}
                    >
                      {w.grade}
                    </Badge>
                    <span className="text-cream truncate font-medium">{w.raceName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-cream/50">
                    <Link
                      to="/stable/$horseId"
                      params={{ horseId: w.horseId }}
                      className="text-cream/70 hover:text-gold truncate max-w-[120px]"
                    >
                      {w.horseName}
                    </Link>
                    <span className="tabular-nums">Y{yearFor(w.raceDay)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {extra > 0 && (
              <p className="text-[10px] font-mono text-cream/40 pt-1">+{extra} more…</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
