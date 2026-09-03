import type { Horse } from "@/game/types";
import { Progress } from "@/components/ui/progress";
import { NumericValue } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";
import { STAT_SCALE_MAX } from "@/constants/horseStatConstants";

const SURFACES: Array<"Turf" | "Dirt" | "Synthetic"> = ["Turf", "Dirt", "Synthetic"];

export function SurfaceAptitudeSection({ horses }: { horses: Horse[] }) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wide font-mono text-cream/50 mb-2">
        Surface aptitude
      </h4>
      <div className={cn("grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {horses.map((h) => (
          <div key={h.id} className="space-y-2">
            <div className="text-xs font-medium text-cream/70">{h.name}</div>
            {SURFACES.map((s) => {
              const val = Math.round((h.surfaceAptitude[s] ?? 0) * STAT_SCALE_MAX);
              return (
                <div key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{s}</span>
                    <NumericValue value={val} suffix="%" />
                  </div>
                  <Progress value={val} className="h-1.5" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
