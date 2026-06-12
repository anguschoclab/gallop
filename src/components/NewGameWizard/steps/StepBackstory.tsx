import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/core/common/formatting";
import { BACKSTORIES } from "@/core/common/backstories";
import type { BackstoryId } from "@/game/types";
import { TOTAL_HORSES, FACILITY_UPGRADE_COUNT } from "./helpers";

interface StepBackstoryProps {
  backstoryId: BackstoryId | undefined;
  setBackstoryId: (id: BackstoryId) => void;
}

export function StepBackstory({ backstoryId, setBackstoryId }: StepBackstoryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {BACKSTORIES.map((b) => {
        const selected = b.id === backstoryId;
        return (
          <Tooltip key={b.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setBackstoryId(b.id)}
                className={`text-left rounded-lg border-2 p-4 transition-all ${
                  selected
                    ? "border-gold bg-t800/60"
                    : "border-t700 bg-t900/40 hover:border-cream-muted"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg text-cream">
                    {b.label}
                  </h3>
                  <span className="text-xs uppercase tracking-wider text-cream-muted">
                    {b.difficulty.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-cream-muted">{b.blurb}</p>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-cream tabular-nums">
                  <dt className="text-cream-muted">Cash</dt>
                  <dd>{formatCurrency(b.startingCash)}</dd>
                  <dt className="text-cream-muted">Horses</dt>
                  <dd>{TOTAL_HORSES(b)}</dd>
                  <dt className="text-cream-muted">Upgraded facilities</dt>
                  <dd>{FACILITY_UPGRADE_COUNT(b)}</dd>
                  <dt className="text-cream-muted">Reputation</dt>
                  <dd>{b.reputationScore}</dd>
                </dl>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {b.difficulty.replace("_", " ")} • starts at reputation {b.reputationScore}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
