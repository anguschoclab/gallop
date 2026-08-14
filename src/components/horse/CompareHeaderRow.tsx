import type { Horse } from "@/game/types";
import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { cn } from "@/lib/cn";

export function CompareHeaderRow({ horses }: { horses: Horse[] }) {
  return (
    <div
      className={cn(
        "grid gap-2 sm:gap-4 border-b border-white/10 pb-4",
        horses.length === 2
          ? "grid-cols-1 sm:grid-cols-[1fr_1fr]"
          : "grid-cols-1 sm:grid-cols-[1fr_1fr_1fr]",
      )}
    >
      {horses.map((h) => (
        <div key={h.id} className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <SilkDot color={h.silk} />
            <span className="font-bold font-[family-name:var(--font-display)] truncate">
              {h.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {Math.floor(h.age)}Y {h.gender}
            </Badge>
            {h.activeInjury && (
              <Badge variant="destructive" className="text-[10px]">
                Injured
              </Badge>
            )}
            {h.lifecycleStatus === "retired" && (
              <Badge variant="outline" className="text-[10px]">
                Retired
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
