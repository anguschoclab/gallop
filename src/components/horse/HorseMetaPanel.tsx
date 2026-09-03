import { Badge } from "@/components/ui/badge";
import { scoutGrade } from "@/core/horse/grading";
import { formatFanCount } from "@/components/horse/fanFormat";
import type { Horse } from "@/game/types";

interface HorseMetaPanelProps {
  horse: Horse;
  isAdvanced: boolean;
  onToggleView: () => void;
}

export function HorseMetaPanel({ horse, isAdvanced, onToggleView }: HorseMetaPanelProps) {
  return (
    <div className="px-5 pb-5 space-y-4">
      {(horse.runningStyle || horse.conformation || horse.distanceAptitude) && (
        <div className="flex flex-wrap gap-1.5">
          {horse.runningStyle && (
            <Badge
              variant="outline"
              className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
            >
              STY: {horse.runningStyle.replace("-", " ")}
            </Badge>
          )}
          {horse.distanceAptitude != null && (
            <Badge
              variant="outline"
              className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
            >
              DIST: {Math.round(horse.distanceAptitude)}m
            </Badge>
          )}
          {horse.surfaceAptitude && (
            <Badge
              variant="outline"
              className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
            >
              SURF:{" "}
              {(() => {
                const best = Object.entries(horse.surfaceAptitude).sort((a, b) => b[1] - a[1])[0];
                return best ? `${best[0]} (${Math.round(best[1])})` : "—";
              })()}
            </Badge>
          )}
          {horse.conformation && (
            <Badge
              variant="outline"
              className="text-[8px] font-mono uppercase bg-white/[0.02] text-cream/60 border-white/10 rounded-none tracking-tighter"
            >
              CNF: {isAdvanced ? horse.conformation : scoutGrade(horse.conformation)}
            </Badge>
          )}
          {(horse.fanCount ?? 0) > 0 && (
            <Badge
              variant="outline"
              className="text-[8px] font-mono uppercase bg-white/[0.02] text-blue-300/60 border-white/10 rounded-none tracking-tighter"
            >
              FANS: {formatFanCount(horse.fanCount)}
            </Badge>
          )}
        </div>
      )}

      {(horse.sireName || horse.damName) && (
        <div className="pt-3 border-t border-white/5 space-y-1">
          <div className="text-[8px] font-black uppercase text-pink-500/40 tracking-wide">
            Genetic Lineage
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-cream/60 uppercase truncate">
            <span className="truncate">{horse.sireName || "UNKNOWN"}</span>
            <span className="text-pink-500/40">×</span>
            <span className="truncate">{horse.damName || "UNKNOWN"}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onToggleView}
          className="text-[9px] font-mono uppercase tracking-wide text-cream/20 hover:text-cream/60 transition-colors"
        >
          {isAdvanced ? "Simple view" : "Advanced metrics"}
        </button>
      </div>
    </div>
  );
}
