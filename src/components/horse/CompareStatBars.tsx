import type { Horse } from "@/game/types";
import { HorseStats } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";

export function CompareStatBars({ horses }: { horses: Horse[] }) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wide font-mono text-cream/50 mb-2">Stats</h4>
      <div className={cn("grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3")}>
        {horses.map((h) => (
          <div key={h.id} className="space-y-2">
            <div className="text-xs font-medium text-cream/70">{h.name}</div>
            <HorseStats horse={h} />
          </div>
        ))}
      </div>
    </div>
  );
}
